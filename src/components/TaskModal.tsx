import React, { useEffect, useState } from 'react';
import type { Task, TaskHistory, TaskStatus } from '../types/crm';
import { useAuth } from '../context/AuthContext';
import { changeTaskStatus, fetchTaskHistory, deleteTask } from '../api/crm';
import { StatusBadge } from './StatusBadge';
import {
  X,
  Clock,
  User,
  Building,
  Calendar,
  CheckCircle2,
  Play,
  Send,
  RotateCcw,
  MessageSquare,
  Trash2,
  AlertCircle,
  FileText
} from 'lucide-react';

interface Props {
  task: Task | null;
  onClose: () => void;
  onTaskUpdated: () => void;
}

export const TaskModal: React.FC<Props> = ({ task, onClose, onTaskUpdated }) => {
  const { user, isManager } = useAuth();
  const [history, setHistory] = useState<TaskHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Состояние для комментария при отправке на доработку
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionComment, setRevisionComment] = useState('');

  useEffect(() => {
    if (task) {
      loadHistory(task.id);
      setError(null);
      setShowRevisionModal(false);
      setRevisionComment('');
    }
  }, [task]);

  const loadHistory = async (taskId: string) => {
    setLoadingHistory(true);
    try {
      const hist = await fetchTaskHistory(taskId);
      setHistory(hist);
    } catch (err: any) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!task) return null;

  const isAssignee = user?.id === task.assignee_id;

  const handleStatusChange = async (newStatus: TaskStatus, comment?: string) => {
    setError(null);
    setActionLoading(true);
    try {
      await changeTaskStatus(task.id, newStatus, comment);
      await loadHistory(task.id);
      setShowRevisionModal(false);
      setRevisionComment('');
      onTaskUpdated();
    } catch (err: any) {
      setError(err?.message || 'Не удалось изменить статус задачи.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Вы уверены, что хотите удалить эту задачу?')) return;
    setActionLoading(true);
    try {
      await deleteTask(task.id);
      onTaskUpdated();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Ошибка удаления задачи');
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-start bg-slate-50">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={task.status} size="md" />
              {task.project && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium">
                  <Building className="w-3.5 h-3.5" />
                  {task.project.name}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900">{task.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Description */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              Описание задачи
            </h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3.5 rounded-xl border border-gray-100 leading-relaxed">
              {task.description || 'Описание отсутствует'}
            </p>
          </div>

          {/* Meta Info Grid */}
          <div className="grid grid-cols-2 gap-4 py-2 border-y border-gray-100 text-sm">
            <div>
              <span className="text-xs text-gray-400 block mb-0.5">Исполнитель</span>
              <div className="font-medium text-gray-800 flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-500" />
                {task.assignee?.full_name || 'Не назначен'}
                {isAssignee && <span className="text-xs text-blue-600 font-semibold">(Вы)</span>}
              </div>
            </div>
            <div>
              <span className="text-xs text-gray-400 block mb-0.5">Постановщик (автор)</span>
              <div className="font-medium text-gray-800 flex items-center gap-1.5">
                <User className="w-4 h-4 text-purple-500" />
                {task.author?.full_name || '—'}
              </div>
            </div>
            <div>
              <span className="text-xs text-gray-400 block mb-0.5">Дата создания</span>
              <div className="text-gray-700 flex items-center gap-1.5 text-xs">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                {formatDate(task.created_at)}
              </div>
            </div>
            <div>
              <span className="text-xs text-gray-400 block mb-0.5">Обновлено</span>
              <div className="text-gray-700 flex items-center gap-1.5 text-xs">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                {formatDate(task.updated_at)}
              </div>
            </div>
          </div>

          {/* Action Buttons Matrix */}
          <div className="bg-slate-50 p-4 rounded-xl border border-gray-200">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-3">
              Доступные действия
            </h3>

            <div className="flex flex-wrap gap-2.5">
              {/* 1. new -> in_progress (Worker only) */}
              {task.status === 'new' && isAssignee && (
                <button
                  onClick={() => handleStatusChange('in_progress')}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 cursor-pointer shadow-sm transition"
                >
                  <Play className="w-4 h-4" />
                  Взять в работу
                </button>
              )}

              {/* 2. in_progress -> review (Worker only) */}
              {task.status === 'in_progress' && isAssignee && (
                <button
                  onClick={() => handleStatusChange('review')}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 cursor-pointer shadow-sm transition"
                >
                  <Send className="w-4 h-4" />
                  Отправить на проверку
                </button>
              )}

              {/* 3. review -> accepted / revision (Manager only) */}
              {task.status === 'review' && isManager && (
                <>
                  <button
                    onClick={() => handleStatusChange('accepted')}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-sm transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Принять задачу
                  </button>

                  <button
                    onClick={() => setShowRevisionModal(true)}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 cursor-pointer shadow-sm transition"
                  >
                    <RotateCcw className="w-4 h-4" />
                    На доработку...
                  </button>
                </>
              )}

              {/* 4. revision -> in_progress (Worker only) */}
              {task.status === 'revision' && isAssignee && (
                <button
                  onClick={() => handleStatusChange('in_progress')}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 cursor-pointer shadow-sm transition"
                >
                  <Play className="w-4 h-4" />
                  Взять в работу
                </button>
              )}

              {/* Delete button (Manager only) */}
              {isManager && (
                <button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 text-sm font-medium border border-transparent hover:border-red-200 transition ml-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  Удалить задачу
                </button>
              )}

              {/* Message if no actions available */}
              {!(
                (task.status === 'new' && isAssignee) ||
                (task.status === 'in_progress' && isAssignee) ||
                (task.status === 'review' && isManager) ||
                (task.status === 'revision' && isAssignee)
              ) && (
                <span className="text-xs text-gray-500 italic py-1">
                  {task.status === 'accepted'
                    ? '✓ Задача успешно завершена и принята'
                    : isManager
                    ? 'Ожидается действие исполнителя'
                    : 'Ожидается проверка постановщиком'}
                </span>
              )}
            </div>

            {/* Sub-form: Mandatory Comment for Revision */}
            {showRevisionModal && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <label className="block text-xs font-semibold uppercase text-rose-700 mb-1.5">
                  Причина возврата на доработку (обязательно):
                </label>
                <textarea
                  value={revisionComment}
                  onChange={(e) => setRevisionComment(e.target.value)}
                  placeholder="Опишите замечания, что конкретно нужно исправить..."
                  className="w-full p-2.5 text-sm rounded-lg border border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                  rows={3}
                  required
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowRevisionModal(false)}
                    className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 rounded-md transition"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    disabled={!revisionComment.trim() || actionLoading}
                    onClick={() => handleStatusChange('revision', revisionComment)}
                    className="px-4 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-md hover:bg-rose-700 disabled:opacity-50 transition"
                  >
                    Подтвердить доработку
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Task History Timeline */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              История изменений
            </h3>

            {loadingHistory ? (
              <div className="text-xs text-gray-400 py-3">Загрузка истории...</div>
            ) : history.length === 0 ? (
              <div className="text-xs text-gray-400 py-2">История пуста</div>
            ) : (
              <div className="relative pl-6 border-l-2 border-gray-200 space-y-4">
                {history.map((item) => (
                  <div key={item.id} className="relative">
                    <span className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-white" />
                    <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-2xs">
                      <div className="flex items-center justify-between gap-2 text-xs text-gray-500 mb-1">
                        <span className="font-semibold text-gray-700">
                          {item.changed_by_profile?.full_name || 'Пользователь'}
                        </span>
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        {item.from_status ? (
                          <>
                            <StatusBadge status={item.from_status} size="sm" />
                            <span className="text-gray-400">→</span>
                            <StatusBadge status={item.to_status} size="sm" />
                          </>
                        ) : (
                          <span className="font-medium text-gray-600">
                            Создание задачи со статусом <StatusBadge status={item.to_status} size="sm" />
                          </span>
                        )}
                      </div>
                      {item.comment && (
                        <div className="mt-2 text-xs bg-slate-50 p-2 rounded-lg border border-slate-100 text-gray-700 flex items-start gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                          <span>{item.comment}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
