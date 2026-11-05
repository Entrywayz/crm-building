import React, { useEffect, useState } from 'react';
import type { Project } from '../types/crm';
import { fetchProjects } from '../api/crm';
import { useAuth } from '../context/AuthContext';
import { CreateProjectModal } from './CreateProjectModal';
import { Building2, MapPin, Plus, CheckSquare, ChevronRight, Loader2 } from 'lucide-react';

interface Props {
  onSelectProject: (projectId: string) => void;
}

export const ProjectsView: React.FC<Props> = ({ onSelectProject }) => {
  const { isManager } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProjects();
      setProjects(data);
    } catch (err: any) {
      setError(err?.message || 'Не удалось загрузить объекты');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Объекты строительства</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isManager
              ? 'Все строительные площадки компании и задачи по ним'
              : 'Объекты, на которых у вас есть назначенные задачи'}
          </p>
        </div>

        {isManager && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm shadow-blue-200 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Добавить объект
          </button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
          <span className="text-sm">Загрузка объектов...</span>
        </div>
      ) : projects.length === 0 ? (
        /* Empty state */
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200/80 p-8 shadow-xs">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-800">Объекты не найдены</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            {isManager
              ? 'Вы еще не добавили ни одного строительного объекта. Нажмите «Добавить объект», чтобы начать.'
              : 'У вас пока нет задач ни на одном объекте.'}
          </p>
        </div>
      ) : (
        /* Grid of Projects */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              className="group bg-white rounded-2xl border border-gray-200/80 hover:border-blue-300 p-6 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    <CheckSquare className="w-3.5 h-3.5 text-gray-400" />
                    Задач: {project.tasks_count ?? 0}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                  {project.name}
                </h3>

                <p className="mt-2 text-sm text-gray-500 flex items-start gap-1.5 line-clamp-2">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  {project.address}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
                <span>Перейти к задачам</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={loadProjects}
      />
    </div>
  );
};

export default ProjectsView;
