import { supabase } from '../utils/supabase';
import type { Project, Task, TaskHistory, TaskStatus, Profile } from '../types/crm';

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  return data as Profile;
}

export async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*, tasks(id)')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    address: p.address,
    created_by: p.created_by,
    created_at: p.created_at,
    tasks_count: p.tasks ? p.tasks.length : 0,
  }));
}

export async function fetchProjectById(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw error;
  }
  return data as Project;
}

export async function createProject(name: string, address: string): Promise<Project> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error('Пользователь не авторизован');

  const { data, error } = await supabase
    .from('projects')
    .insert({
      name,
      address,
      created_by: userData.user.id,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data as Project;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function fetchTasks(projectId?: string): Promise<Task[]> {
  let query = supabase
    .from('tasks')
    .select(`
      *,
      assignee:profiles!tasks_assignee_id_fkey(id, email, full_name, role),
      author:profiles!tasks_author_id_fkey(id, email, full_name, role),
      project:projects(id, name, address)
    `)
    .order('created_at', { ascending: false });

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as Task[];
}

export async function fetchWorkers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'worker')
    .order('full_name', { ascending: true });

  if (error) throw error;
  return (data || []) as Profile[];
}

export async function createTask(payload: {
  project_id: string;
  title: string;
  description: string;
  assignee_id: string;
}): Promise<Task> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error('Пользователь не авторизован');

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      project_id: payload.project_id,
      title: payload.title,
      description: payload.description,
      assignee_id: payload.assignee_id,
      author_id: userData.user.id,
      status: 'new',
    })
    .select(`
      *,
      assignee:profiles!tasks_assignee_id_fkey(id, email, full_name, role),
      author:profiles!tasks_author_id_fkey(id, email, full_name, role)
    `)
    .single();

  if (error) throw error;
  return data as Task;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Смена статуса через защищенную RPC-функцию в PostgreSQL
 */
export async function changeTaskStatus(
  taskId: string,
  newStatus: TaskStatus,
  comment?: string
): Promise<Task> {
  const { data, error } = await supabase.rpc('change_task_status', {
    p_task_id: taskId,
    p_new_status: newStatus,
    p_comment: comment && comment.trim().length > 0 ? comment.trim() : null,
  });

  if (error) throw error;
  return data as Task;
}

export async function fetchTaskHistory(taskId: string): Promise<TaskHistory[]> {
  const { data, error } = await supabase
    .from('task_history')
    .select(`
      *,
      changed_by_profile:profiles!task_history_changed_by_fkey(id, email, full_name, role)
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as TaskHistory[];
}
