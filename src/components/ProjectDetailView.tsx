import React, { useEffect, useState } from 'react';
import type { Project, Task } from '../types/crm';
import { fetchProjectById, fetchTasks, deleteProject } from '../api/crm';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from './StatusBadge';
import { TaskModal } from './TaskModal';
import { CreateTaskModal } from './CreateTaskModal';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Plus,
  Trash2,
  User,
  Calendar,
  CheckSquare,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface Props {
  projectId: string;
  onBack: () => void;
}

export const ProjectDetailView: React.FC<Props> = ({ projectId, onBack }) => {
  const { isManager } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [projData, tasksData] = await Promise.all([
        fetchProjectById(projectId),
        fetchTasks(projectId),
      ]);
      setProject(projData);
      setTasks(tasksData);
    } catch (err: any) {
      setError(err?.message || 'Не удалось загрузить данные объекта');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleDeleteProject = async () => {
    if (!confirm('Вы уверены, что хотите удалить этот объект и все его задачи?')) return;
    try {
      await deleteProject(projectId);
      onBack();
    } catch (err: any) {
      alert('Ошибка при удалении: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <span className="text-sm">Загрузка карточки объекта...</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-4 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Назад к списку объектов
        </button>
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span>{error || 'Объект не найден или у вас нет прав на его просмотр'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Navigation & Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 mb-4 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Назад ко всем объектам
        </button>

        <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
              <Building2 className="w-4 h-4" /> Строительный объект
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <p className="mt-1 text-sm text-gray-500 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
              {project.address}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {isManager && (
              <>
                <button
                  onClick={handleDeleteProject}
                  title="Удалить объект"
                  className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-200 transition cursor-pointer"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsCreateTaskOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm shadow-blue-200 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Поставить задачу
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tasks Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-gray-500" />
            Задачи по объекту ({tasks.length})
          </h2>
        </div>

        {tasks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center">
            <CheckSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-gray-700">Задач пока нет</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              {isManager
                ? 'Нажмите «Поставить задачу», чтобы назначить работу исполнителю.'
                : 'По данному объекту у вас еще нет активных задач.'}
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
      </div>

      {/* Task Details Modal */}
      <TaskModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onTaskUpdated={loadData}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        projectId={projectId}
        projectName={project.name}
        onClose={() => setIsCreateTaskOpen(false)}
        onCreated={loadData}
      />
    </div>
  );
};

export default ProjectDetailView;
