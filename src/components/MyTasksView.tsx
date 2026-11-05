import React, { useEffect, useState } from 'react';
import type { Task } from '../types/crm';
import { fetchTasks } from '../api/crm';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from './StatusBadge';
import { TaskModal } from './TaskModal';
import { CheckSquare, Building, Calendar, Loader2, User } from 'lucide-react';

export const MyTasksView: React.FC = () => {
  const { user, isManager } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const loadTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const allTasks = await fetchTasks();
      // Для исполнителя RLS сам вернет только его задачи.
      // Для менеджера покажем задачи, где он исполнитель (или все задачи с фильтром)
      const myOnly = isManager ? allTasks.filter((t) => t.assignee_id === user?.id) : allTasks;
      // Если у менеджера нет персонально назначенных, покажем общий пул задач
      setTasks(isManager && myOnly.length === 0 ? allTasks : myOnly);
    } catch (err: any) {
      setError(err?.message || 'Не удалось загрузить задачи');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [user]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          {isManager ? 'Все задачи в работе' : 'Мои задачи'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isManager
            ? 'Сводный список задач по всем объектам'
            : 'Задачи, назначенные на вас. Нажмите на задачу, чтобы обновить статус или посмотреть историю.'}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
          <span className="text-sm">Загрузка задач...</span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200/80 p-8 shadow-xs">
          <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-800">У вас нет активных задач</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            Когда руководитель назначит вам задачу, она появится здесь.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs divide-y divide-gray-100 overflow-hidden">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => setSelectedTask(task)}
              className="p-4 sm:p-5 hover:bg-slate-50 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <StatusBadge status={task.status} />
                  <span className="font-semibold text-gray-900 text-base hover:text-blue-600 transition">
                    {task.title}
                  </span>
                </div>
                {task.description && (
                  <p className="text-xs text-gray-500 line-clamp-1 pl-0.5">
                    {task.description}
                  </p>
                )}
                {task.project && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 pt-1">
                    <Building className="w-3.5 h-3.5" />
                    <span>{task.project.name}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500 shrink-0">
                <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                  <User className="w-3.5 h-3.5 text-blue-500" />
                  <span className="font-medium text-gray-700">
                    {task.assignee?.full_name || 'Не назначен'}
                  </span>
                </div>

                <div className="hidden md:flex items-center gap-1 text-gray-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(task.created_at).toLocaleDateString('ru-RU')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task Details Modal */}
      <TaskModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onTaskUpdated={loadTasks}
      />
    </div>
  );
};

export default MyTasksView;
