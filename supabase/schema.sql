do $$ begin
    create type public.user_role as enum ('manager', 'worker');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type public.task_status as enum ('new', 'in_progress', 'review', 'accepted', 'revision');
exception
    when duplicate_object then null;
end $$;

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    full_name text not null,
    role public.user_role not null default 'worker',
    created_at timestamptz default now()
);

create table if not exists public.projects (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    address text not null,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz default now()
);

-- 4. ТАБЛИЦА ЗАДАЧ
create table if not exists public.tasks (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    title text not null,
    description text default '',
    assignee_id uuid not null references public.profiles(id) on delete restrict,
    author_id uuid not null references public.profiles(id) on delete restrict,
    status public.task_status not null default 'new',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 5. ТАБЛИЦА ИСТОРИИ ИЗМЕНЕНИЙ СТАТУСОВ
create table if not exists public.task_history (
    id uuid primary key default gen_random_uuid(),
    task_id uuid not null references public.tasks(id) on delete cascade,
    from_status public.task_status,
    to_status public.task_status not null,
    changed_by uuid not null references public.profiles(id) on delete restrict,
    comment text,
    created_at timestamptz default now()
);

-- Индексы для ускорения выборок и RLS
create index if not exists idx_tasks_project_id on public.tasks(project_id);
create index if not exists idx_tasks_assignee_id on public.tasks(assignee_id);
create index if not exists idx_task_history_task_id on public.task_history(task_id);

-- ==============================================================================
-- 6. ХЕЛПЕРЫ И ТРИГГЕРЫ
-- ==============================================================================

-- Функция получения роли текущего пользователя без рекурсии в RLS
create or replace function public.get_current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
    select role from public.profiles where id = auth.uid();
$$;

-- Триггер: при регистрации пользователя в auth.users автоматически создаем профиль
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, email, full_name, role)
    values (
        new.id,
        coalesce(new.email, ''),
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'worker'::public.user_role)
    )
    on conflict (id) do update set
        email = excluded.email,
        full_name = case when public.profiles.full_name = '' then excluded.full_name else public.profiles.full_name end;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- Триггер: логирование создания задачи в историю
create or replace function public.log_task_creation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.task_history (task_id, from_status, to_status, changed_by, comment)
    values (new.id, null, new.status, new.author_id, 'Задача создана');
    return new;
end;
$$;

drop trigger if exists on_task_created on public.tasks;
create trigger on_task_created
    after insert on public.tasks
    for each row execute function public.log_task_creation();

-- ==============================================================================
-- 7. ЗАЩИТА СТЕЙТ-МАШИНЫ: RPC И ЗАПРЕТ ПРЯМОГО ИЗМЕНЕНИЯ СТАТУСА
-- ==============================================================================

-- Защита: запрещаем менять status напрямую через обычный UPDATE (только через RPC change_task_status)
create or replace function public.prevent_direct_status_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Если статус меняется, проверяем специальный флаг сессии, который ставит только RPC
    if old.status is distinct from new.status and current_setting('crm.allow_status_update', true) <> 'true' then
        raise exception 'Прямое изменение статуса запрещено. Используйте функцию change_task_status().';
    end if;
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists on_task_status_guard on public.tasks;
create trigger on_task_status_guard
    before update on public.tasks
    for each row execute function public.prevent_direct_status_update();

-- RPC Функция для смены статуса с жесткой проверкой прав и матрицы переходов
create or replace function public.change_task_status(
    p_task_id uuid,
    p_new_status public.task_status,
    p_comment text default null
)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid := auth.uid();
    v_role public.user_role;
    v_task public.tasks%rowtype;
    v_prev_status public.task_status;
begin
    if v_user_id is null then
        raise exception 'Не авторизован';
    end if;

    select role into v_role from public.profiles where id = v_user_id;
    if v_role is null then
        raise exception 'Профиль пользователя не найден';
    end if;

    select * into v_task from public.tasks where id = p_task_id for update;
    if not found then
        raise exception 'Задача не найдена';
    end if;

    v_prev_status := v_task.status;

    -- Проверка переходов по ТЗ
    if v_prev_status = 'new' and p_new_status = 'in_progress' then
        if v_task.assignee_id <> v_user_id then
            raise exception 'Только назначенный исполнитель может взять задачу в работу';
        end if;

    elsif v_prev_status = 'in_progress' and p_new_status = 'review' then
        if v_task.assignee_id <> v_user_id then
            raise exception 'Только назначенный исполнитель может отправить задачу на проверку';
        end if;

    elsif v_prev_status = 'review' and p_new_status = 'accepted' then
        if v_role <> 'manager' then
            raise exception 'Только постановщик может принять задачу';
        end if;

    elsif v_prev_status = 'review' and p_new_status = 'revision' then
        if v_role <> 'manager' then
            raise exception 'Только постановщик может вернуть задачу на доработку';
        end if;
        if p_comment is null or length(trim(p_comment)) = 0 then
            raise exception 'Комментарий обязателен при возврате на доработку';
        end if;

    elsif v_prev_status = 'revision' and p_new_status = 'in_progress' then
        if v_task.assignee_id <> v_user_id then
            raise exception 'Только назначенный исполнитель может вернуть задачу в работу';
        end if;

    else
        raise exception 'Запрещенный переход статуса: % -> % (роль: %)', v_prev_status, p_new_status, v_role;
    end if;

    -- Разрешаем смену статуса
    perform set_config('crm.allow_status_update', 'true', true);

    update public.tasks
    set status = p_new_status,
        updated_at = now()
    where id = p_task_id
    returning * into v_task;

    insert into public.task_history (task_id, from_status, to_status, changed_by, comment)
    values (
        p_task_id,
        v_prev_status,
        p_new_status,
        v_user_id,
        nullif(trim(p_comment), '')
    );

    return v_task;
end;
$$;

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) ПОЛИТИКИ
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_history enable row level security;

-- PROFILES
drop policy if exists "Authenticated users can view profiles" on public.profiles;
create policy "Authenticated users can view profiles"
    on public.profiles for select
    to authenticated
    using (true);

drop policy if exists "Users can update their own profile name" on public.profiles;
create policy "Users can update their own profile name"
    on public.profiles for update
    to authenticated
    using (id = auth.uid())
    with check (id = auth.uid());

-- PROJECTS
drop policy if exists "Managers can view all projects" on public.projects;
create policy "Managers can view all projects"
    on public.projects for select
    to authenticated
    using (public.get_current_role() = 'manager');

drop policy if exists "Workers can view projects where they have assigned tasks" on public.projects;
create policy "Workers can view projects where they have assigned tasks"
    on public.projects for select
    to authenticated
    using (
        public.get_current_role() = 'worker' and
        exists (
            select 1 from public.tasks
            where tasks.project_id = projects.id
              and tasks.assignee_id = auth.uid()
        )
    );

drop policy if exists "Only managers can insert projects" on public.projects;
create policy "Only managers can insert projects"
    on public.projects for insert
    to authenticated
    with check (public.get_current_role() = 'manager');

drop policy if exists "Only managers can update projects" on public.projects;
create policy "Only managers can update projects"
    on public.projects for update
    to authenticated
    using (public.get_current_role() = 'manager')
    with check (public.get_current_role() = 'manager');

drop policy if exists "Only managers can delete projects" on public.projects;
create policy "Only managers can delete projects"
    on public.projects for delete
    to authenticated
    using (public.get_current_role() = 'manager');

-- TASKS
drop policy if exists "Managers can view all tasks" on public.tasks;
create policy "Managers can view all tasks"
    on public.tasks for select
    to authenticated
    using (public.get_current_role() = 'manager');

drop policy if exists "Workers can only view their assigned tasks" on public.tasks;
create policy "Workers can only view their assigned tasks"
    on public.tasks for select
    to authenticated
    using (
        public.get_current_role() = 'worker' and
        assignee_id = auth.uid()
    );

drop policy if exists "Only managers can insert tasks" on public.tasks;
create policy "Only managers can insert tasks"
    on public.tasks for insert
    to authenticated
    with check (public.get_current_role() = 'manager');

drop policy if exists "Only managers can update task details" on public.tasks;
create policy "Only managers can update task details"
    on public.tasks for update
    to authenticated
    using (public.get_current_role() = 'manager')
    with check (public.get_current_role() = 'manager');

drop policy if exists "Only managers can delete tasks" on public.tasks;
create policy "Only managers can delete tasks"
    on public.tasks for delete
    to authenticated
    using (public.get_current_role() = 'manager');

-- TASK HISTORY
-- Историю видят обе роли, но ТОЛЬКО если имеют доступ к самой задаче
drop policy if exists "Users can view history of tasks they have access to" on public.task_history;
create policy "Users can view history of tasks they have access to"
    on public.task_history for select
    to authenticated
    using (
        public.get_current_role() = 'manager' or
        exists (
            select 1 from public.tasks
            where tasks.id = task_history.task_id
              and tasks.assignee_id = auth.uid()
        )
    );

-- ВАЖНО: Никаких INSERT/UPDATE/DELETE политик для task_history для authenticated пользователей!
-- Любые попытки вставить/изменить/удалить историю через API напрямую получат отлуп RLS.
-- Запись идет только через SECURITY DEFINER функции/триггеры.

-- ==============================================================================
-- 9. ТЕСТОВЫЕ ПОЛЬЗОВАТЕЛИ И ДЕМО-ДАННЫЕ (SEED)
-- Пароль для всех: Pass123456!
-- ==============================================================================

create extension if not exists pgcrypto;

do $$
declare
    v_manager_id uuid := '11111111-1111-1111-1111-111111111111';
    v_worker1_id uuid := '22222222-2222-2222-2222-222222222222';
    v_worker2_id uuid := '33333333-3333-3333-3333-333333333333';
    v_proj1_id   uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    v_proj2_id   uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    v_proj3_id   uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    v_task1_id   uuid := '10000000-0000-0000-0000-000000000001';
    v_task2_id   uuid := '10000000-0000-0000-0000-000000000002';
    v_task3_id   uuid := '10000000-0000-0000-0000-000000000003';
    v_task4_id   uuid := '10000000-0000-0000-0000-000000000004';
begin
    -- 1. Создаем auth.users, если их нет, или обновляем существующие
    -- Важно: строковые поля токенов обязаны быть '' (пустыми строками), а не NULL,
    -- иначе GoTrue (Supabase Auth) падает с ошибкой 500 "Database error querying schema"
    insert into auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new,
        email_change_token_current, email_change, phone_change_token, phone_change,
        reauthentication_token, is_super_admin
    )
    values
    (
        v_manager_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'manager@crm.test', crypt('Pass123456!', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}', '{"full_name":"Алексей Иванов (Руководитель)","role":"manager"}', now(), now(),
        '', '', '', '', '', '', '', '', false
    ),
    (
        v_worker1_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'worker1@crm.test', crypt('Pass123456!', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}', '{"full_name":"Дмитрий Смирнов (Бригадир)","role":"worker"}', now(), now(),
        '', '', '', '', '', '', '', '', false
    ),
    (
        v_worker2_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'worker2@crm.test', crypt('Pass123456!', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}', '{"full_name":"Иван Кузнецов (Монтажник)","role":"worker"}', now(), now(),
        '', '', '', '', '', '', '', '', false
    )
    on conflict (id) do update set
        encrypted_password = excluded.encrypted_password,
        email_confirmed_at = excluded.email_confirmed_at,
        raw_app_meta_data = excluded.raw_app_meta_data,
        raw_user_meta_data = excluded.raw_user_meta_data,
        confirmation_token = '',
        recovery_token = '',
        email_change_token_new = '',
        email_change_token_current = '',
        email_change = '',
        phone_change_token = '',
        phone_change = '',
        reauthentication_token = '',
        is_super_admin = false;

    -- Исправление для всех уже существующих пользователей (заменяем NULL на '')
    update auth.users
    set
        confirmation_token = coalesce(confirmation_token, ''),
        recovery_token = coalesce(recovery_token, ''),
        email_change_token_new = coalesce(email_change_token_new, ''),
        email_change_token_current = coalesce(email_change_token_current, ''),
        email_change = coalesce(email_change, ''),
        phone_change_token = coalesce(phone_change_token, ''),
        phone_change = coalesce(phone_change, ''),
        reauthentication_token = coalesce(reauthentication_token, ''),
        is_super_admin = coalesce(is_super_admin, false);

    -- Привязка identities (необходимо для работы Supabase Auth signInWithPassword)
    insert into auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    )
    values
    (
        v_manager_id, v_manager_id, json_build_object('sub', v_manager_id::text, 'email', 'manager@crm.test'),
        'email', v_manager_id::text, now(), now(), now()
    ),
    (
        v_worker1_id, v_worker1_id, json_build_object('sub', v_worker1_id::text, 'email', 'worker1@crm.test'),
        'email', v_worker1_id::text, now(), now(), now()
    ),
    (
        v_worker2_id, v_worker2_id, json_build_object('sub', v_worker2_id::text, 'email', 'worker2@crm.test'),
        'email', v_worker2_id::text, now(), now(), now()
    )
    on conflict (provider_id, provider) do update set
        identity_data = excluded.identity_data,
        last_sign_in_at = excluded.last_sign_in_at;

    -- 2. Обновляем/гарантируем профили с ролями
    insert into public.profiles (id, email, full_name, role)
    values
        (v_manager_id, 'manager@crm.test', 'Алексей Иванов (Руководитель)', 'manager'),
        (v_worker1_id, 'worker1@crm.test', 'Дмитрий Смирнов (Бригадир)', 'worker'),
        (v_worker2_id, 'worker2@crm.test', 'Иван Кузнецов (Монтажник)', 'worker')
    on conflict (id) do update set
        role = excluded.role,
        full_name = excluded.full_name;

    -- 3. Создаем 3 объекта
    insert into public.projects (id, name, address, created_by)
    values
        (v_proj1_id, 'ЖК "Северные Высоты"', 'г. Москва, ш. Дмитровское, д. 42', v_manager_id),
        (v_proj2_id, 'Бизнес-центр "Орион"', 'г. Москва, ул. Ленинская, д. 15', v_manager_id),
        (v_proj3_id, 'Складской комплекс "Логистик"', 'МО, г. Подольск, проезд Индустриальный, 7', v_manager_id)
    on conflict (id) do nothing;

    -- 4. Временно разрешаем смену статуса для сид-задач
    perform set_config('crm.allow_status_update', 'true', true);

    -- 5. Создаем задачи в разных статусах
    -- Задача 1 (worker1, статус new)
    insert into public.tasks (id, project_id, title, description, assignee_id, author_id, status)
    values (v_task1_id, v_proj1_id, 'Монтаж опалубки 3 этажа', 'Подготовить арматурный каркас и выставить опалубку до конца недели.', v_worker1_id, v_manager_id, 'new')
    on conflict (id) do nothing;

    -- Задача 2 (worker1, статус in_progress)
    insert into public.tasks (id, project_id, title, description, assignee_id, author_id, status)
    values (v_task2_id, v_proj1_id, 'Заливка бетона перекрытия', 'Приемка 4 миксеров, уплотнение глубинным вибратором.', v_worker1_id, v_manager_id, 'in_progress')
    on conflict (id) do nothing;

    -- Задача 3 (worker2, статус review)
    insert into public.tasks (id, project_id, title, description, assignee_id, author_id, status)
    values (v_task3_id, v_proj2_id, 'Прокладка силового кабеля', 'Трасса 120м в лотках на 2-м этаже, замеры изоляции выполнены.', v_worker2_id, v_manager_id, 'review')
    on conflict (id) do nothing;

    -- Задача 4 (worker2, статус revision)
    insert into public.tasks (id, project_id, title, description, assignee_id, author_id, status)
    values (v_task4_id, v_proj2_id, 'Установка распределительных щитов', 'Щиты ЩО-1 и ЩО-2 на первой секции.', v_worker2_id, v_manager_id, 'revision')
    on conflict (id) do nothing;

    -- Добавляем комментарий в историю для задачи на доработке
    insert into public.task_history (task_id, from_status, to_status, changed_by, comment)
    values (v_task4_id, 'review', 'revision', v_manager_id, 'Маркировка автоматов не соответствует схеме, переделать подписи')
    on conflict do nothing;

end $$;
