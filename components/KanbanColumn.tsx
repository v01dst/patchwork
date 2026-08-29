'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Status, Task } from '@/types';
import { KanbanCard } from './KanbanCard';
import { Plus, MoreVertical, Edit2, Trash2 } from 'lucide-react';

interface KanbanColumnProps {
  status: Status;
  statuses: Status[];
  tasks: Task[];
  onAddTask: (statusId: string) => void;
  onTaskClick: (task: Task) => void;
  onEditStatus: (status: Status) => void;
  onDeleteStatus: (statusId: string) => void;
  onStatusChangeMobile: (taskId: string, newStatusId: string) => void;
}

export function KanbanColumn({
  status,
  statuses,
  tasks,
  onAddTask,
  onTaskClick,
  onEditStatus,
  onDeleteStatus,
  onStatusChangeMobile,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
    data: {
      type: 'Column',
      status,
    },
  });

  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col flex-shrink-0 w-80 max-w-full bg-slate-100/80 dark:bg-slate-900/60 rounded-2xl p-3 border transition-colors ${
        isOver ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20' : 'border-slate-200/80 dark:border-slate-800'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 px-1">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: status.color || '#64748b' }}
          />
          <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
            {status.name}
          </h3>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-1 relative">
          <button
            onClick={() => onAddTask(status.id)}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
            title="Add task to column"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-8 z-30 w-36 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 text-sm">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onEditStatus(status);
                }}
                className="w-full px-3 py-1.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
              >
                <Edit2 className="w-3.5 h-3.5" /> Rename / Color
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onDeleteStatus(status.id);
                }}
                className="w-full px-3 py-1.5 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Status
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Task List */}
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2.5 overflow-y-auto min-h-[150px] max-h-[calc(100vh-280px)] pr-0.5">
          {tasks.map(task => (
            <KanbanCard
              key={task.id}
              task={task}
              statuses={statuses}
              onClick={() => onTaskClick(task)}
              onStatusChangeMobile={(newStatusId) => onStatusChangeMobile(task.id, newStatusId)}
            />
          ))}

          {tasks.length === 0 && (
            <div className="h-24 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-xs text-slate-400 dark:text-slate-600">
              No tasks
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
