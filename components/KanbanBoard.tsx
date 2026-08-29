'use client';

import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Status, Task } from '@/types';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';

interface KanbanBoardProps {
  statuses: Status[];
  tasks: Task[];
  onTaskMove: (taskId: string, targetStatusId: string) => Promise<void>;
  onAddTask: (statusId: string) => void;
  onTaskClick: (task: Task) => void;
  onEditStatus: (status: Status) => void;
  onDeleteStatus: (statusId: string) => void;
  onAddStatus: () => void;
}

export function KanbanBoard({
  statuses,
  tasks,
  onTaskMove,
  onAddTask,
  onTaskClick,
  onEditStatus,
  onDeleteStatus,
  onAddStatus,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // minimum distance before drag activates
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortedStatuses = [...statuses].sort((a, b) => a.order_index - b.order_index);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeTaskId = active.id as string;
    const overId = over.id as string;

    const sourceTask = tasks.find(t => t.id === activeTaskId);
    if (!sourceTask) return;

    // Check if dropped onto a column directly or another task
    let targetStatusId: string | null = null;

    const isOverColumn = statuses.some(s => s.id === overId);
    if (isOverColumn) {
      targetStatusId = overId;
    } else {
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) {
        targetStatusId = overTask.status_id;
      }
    }

    if (targetStatusId && targetStatusId !== sourceTask.status_id) {
      await onTaskMove(activeTaskId, targetStatusId);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 items-start">
        {sortedStatuses.map(status => {
          const columnTasks = tasks.filter(t => t.status_id === status.id);
          return (
            <KanbanColumn
              key={status.id}
              status={status}
              statuses={statuses}
              tasks={columnTasks}
              onAddTask={onAddTask}
              onTaskClick={onTaskClick}
              onEditStatus={onEditStatus}
              onDeleteStatus={onDeleteStatus}
              onStatusChangeMobile={onTaskMove}
            />
          );
        })}

        {/* Add Status Button */}
        <button
          onClick={onAddStatus}
          className="flex-shrink-0 w-72 h-14 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition font-medium text-sm"
        >
          + Add Column
        </button>
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="w-80">
            <KanbanCard
              task={activeTask}
              statuses={statuses}
              onClick={() => {}}
              onStatusChangeMobile={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
