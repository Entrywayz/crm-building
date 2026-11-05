import React, { useEffect, useState } from 'react';
import { createTask, fetchWorkers } from '../api/crm';
import type { Profile } from '../types/crm';
import { X, CheckSquare, User, FileText, AlignLeft } from 'lucide-react';

interface Props {
  isOpen: boolean;
  projectId: string;
  projectName: string;
  onClose: () => void;
  onCreated: () => void;
}

export const CreateTaskModal: React.FC<Props> = ({
  isOpen,
  projectId,
  projectName,
  onClose,
  onCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [workers, setWorkers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchWorkers()
        .then((data) => {
          setWorkers(data);
          if (data.length > 0 && !assigneeId) {
            setAssigneeId(data[0].id);
          }
        })
        .catch((err) => console.error('Failed to load workers:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !assigneeId) {
      setError('Заполните название задачи и выберите исполнителя');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await createTask({
        project_id: projectId,
        title: title.trim(),
        description: description.trim(),
        assignee_id: assigneeId,
      });
      setTitle('');
      setDescription('');
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Не удалось создать задачу');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-blue-600" />
              Новая задача
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Объект: {projectName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              Название задачи *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="например, Армирование фундаментной плиты"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1 flex items-center gap-1">
              <AlignLeft className="w-3.5 h-3.5 text-gray-400" />
              Описание задачи
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Подробности задачи, требования, объем..."
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-gray-400" />
              Исполнитель *
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              required
            >
              {workers.length === 0 ? (
                <option value="">Нет доступных исполнителей</option>
              ) : (
                workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.full_name} ({w.email})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || workers.length === 0}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Создание...' : 'Поставить задачу'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskModal;
