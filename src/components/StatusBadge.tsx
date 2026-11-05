import React from 'react';
import type { TaskStatus } from '../types/crm';

interface Props {
  status: TaskStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<TaskStatus, { label: string; bg: string; text: string; dot: string }> = {
  new: {
    label: 'Новая',
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  in_progress: {
    label: 'В работе',
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  review: {
    label: 'На проверке',
    bg: 'bg-purple-50 text-purple-700 border-purple-200',
    text: 'text-purple-700',
    dot: 'bg-purple-500',
  },
  accepted: {
    label: 'Принята',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  revision: {
    label: 'На доработке',
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    text: 'text-rose-700',
    dot: 'bg-rose-500',
  },
};

export const StatusBadge: React.FC<Props> = ({ status, size = 'sm' }) => {
  const config = statusConfig[status] || {
    label: status,
    bg: 'bg-gray-100 text-gray-700 border-gray-200',
    text: 'text-gray-700',
    dot: 'bg-gray-400',
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${config.bg} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};
