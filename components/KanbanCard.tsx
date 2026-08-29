'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, Status } from '@/types';
import { formatDate, getPriorityColor, cn } from '@/lib/utils';
import { Calendar, User, AlertCircle, GripVertical } from 'lucide-react';

interface KanbanCardProps {
  task: Task;
  statuses: Status[];
  onClick: () => void;
  onStatusChangeMobile: (statusId: string) => void;
}

export function KanbanCard({ task, statuses, onClick, onStatusChangeMobile }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const pColor = getPriorityColor(task.priority);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative bg-white dark:bg-slate-800/90 rounded-xl p-3.5 shadow-xs border transition-all select-none hover:shadow-md cursor-pointer',
        task.is_overdue
          ? 'border-red-400 dark:border-red-800/80 bg-red-50/20 dark:bg-red-950/10'
          : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600',
        isDragging && 'opacity-40 shadow-xl ring-2 ring-indigo-500 scale-[1.02]'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span
          className={cn(
            'px-2 py-0.5 text-[11px] font-semibold rounded-md border capitalize',
            pColor.bg,
            pColor.text,
            pColor.border
          )}
        >
          {task.priority}
        </span>

        <div className="flex items-center gap-1">
          {task.is_overdue && (
            <span className="flex items-center gap-0.5 text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/50 px-1.5 py-0.5 rounded-md border border-red-200 dark:border-red-900">
              <AlertCircle className="w-3 h-3" /> Overdue
            </span>
          )}

          {/* Drag Handle on Desktop */}
          <div
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="hidden sm:flex text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 cursor-grab active:cursor-grabbing rounded hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <GripVertical className="w-4 h-4" />
          </div>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 leading-snug">
        {task.title}
      </h3>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.map(tag => (
            <span
              key={tag.id}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300"
            >
              #{tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700/50">
        <div className="flex items-center gap-1 truncate max-w-[120px]">
          <User className="w-3 h-3 shrink-0" />
          <span className="truncate">{task.assignee || 'Unassigned'}</span>
        </div>

        {task.due_date && (
          <div
            className={cn(
              'flex items-center gap-1 shrink-0 font-medium',
              task.is_overdue ? 'text-red-600 dark:text-red-400 font-bold' : ''
            )}
          >
            <Calendar className="w-3 h-3" />
            <span>{formatDate(task.due_date)}</span>
          </div>
        )}
      </div>

      {/* Mobile-Friendly Status Dropdown fallback */}
      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/50 sm:hidden flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
        <span className="text-[11px] font-medium text-slate-500">Move:</span>
        <select
          value={task.status_id}
          onChange={(e) => onStatusChangeMobile(e.target.value)}
          className="text-xs bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-hidden"
        >
          {statuses.map(s => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
