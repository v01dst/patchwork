'use client';

import React, { useState, useEffect } from 'react';
import { Task, Status, Activity } from '@/types';
import { formatDate, getPriorityColor, cn } from '@/lib/utils';
import { X, Calendar, User, Tag as TagIcon, Clock, Edit2, Trash2, AlertCircle } from 'lucide-react';

interface TaskDetailModalProps {
  task: Task | null;
  statuses: Status[];
  isOpen: boolean;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export function TaskDetailModal({
  task,
  statuses,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: TaskDetailModalProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  useEffect(() => {
    if (task && isOpen) {
      setLoadingActivities(true);
      fetch(`/api/tasks/${task.id}/activity`)
        .then(res => res.json())
        .then(json => {
          if (json.data) setActivities(json.data);
        })
        .catch(err => console.error('Failed to load task activities:', err))
        .finally(() => setLoadingActivities(false));
    }
  }, [task, isOpen]);

  if (!isOpen || !task) return null;

  const currentStatus = statuses.find(s => s.id === task.status_id);
  const pColor = getPriorityColor(task.priority);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                className="px-2.5 py-0.5 text-xs font-semibold rounded-full border"
                style={{
                  backgroundColor: `${currentStatus?.color || '#64748b'}20`,
                  color: currentStatus?.color || '#64748b',
                  borderColor: `${currentStatus?.color || '#64748b'}40`,
                }}
              >
                {currentStatus?.name || 'Unknown'}
              </span>
              <span className={cn('px-2.5 py-0.5 text-xs font-semibold rounded-full border capitalize', pColor.bg, pColor.text, pColor.border)}>
                {task.priority}
              </span>
              {task.is_overdue && (
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Overdue
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
              {task.title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(task)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              title="Edit Task"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (confirm(`Are you sure you want to delete task "${task.title}"?`)) {
                  onDelete(task.id);
                  onClose();
                }
              }}
              className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 transition"
              title="Delete Task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                <User className="w-3.5 h-3.5" /> Assignee
              </span>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {task.assignee || 'Unassigned'}
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                <Calendar className="w-3.5 h-3.5" /> Due Date
              </span>
              <span className={cn('text-sm font-medium', task.is_overdue ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-800 dark:text-slate-200')}>
                {formatDate(task.due_date)}
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                <Clock className="w-3.5 h-3.5" /> Created
              </span>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {formatDate(task.created_at)}
              </span>
            </div>
          </div>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1">
                <TagIcon className="w-3.5 h-3.5" /> Tags
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map(tag => (
                  <span
                    key={tag.id}
                    className="px-2.5 py-1 text-xs rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono"
                  >
                    #{tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Description
            </h4>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
              {task.description ? task.description : <span className="text-slate-400 italic">No description provided.</span>}
            </div>
          </div>

          {/* Task Activity Timeline */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Audit Activity Log
            </h4>
            <div className="space-y-3">
              {loadingActivities ? (
                <div className="text-xs text-slate-400">Loading activity...</div>
              ) : activities.length === 0 ? (
                <div className="text-xs text-slate-400 italic">No activity recorded.</div>
              ) : (
                <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-800 space-y-4">
                  {activities.map(act => (
                    <div key={act.id} className="relative group">
                      <div className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white dark:ring-slate-900" />
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                        {new Date(act.created_at).toLocaleString()}
                      </div>
                      <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">
                        {act.description || `Updated ${act.field}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
