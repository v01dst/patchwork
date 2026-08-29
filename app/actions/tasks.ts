'use server';

import {
  getTasksByProject as dbGetTasksByProject,
  getTaskById as dbGetTaskById,
  createTask as dbCreateTask,
  updateTask as dbUpdateTask,
  deleteTask as dbDeleteTask,
  DbError,
} from '@/lib/db';
import {
  ALLOWED_PRIORITIES,
  validateTaskInput,
  validateStatusBelongsToProject,
} from '@/lib/validate';
import { Task, Priority } from '@/types';
import { ActionResult, toActionError } from './projects';

// Re-export for convenience so callers can branch on validation failures.
export { DbError };

export async function getTasksByProjectAction(projectId: string): Promise<ActionResult<Task[]>> {
  try {
    if (!projectId) return { error: 'Project ID is required' };
    const tasks = await dbGetTasksByProject(projectId);
    return { data: tasks };
  } catch (err) {
    return { error: toActionError(err, 'Failed to retrieve tasks') };
  }
}

export async function getTaskByIdAction(id: string): Promise<ActionResult<Task>> {
  try {
    if (!id) return { error: 'Task ID is required' };
    const task = await dbGetTaskById(id);
    if (!task) return { error: 'Task not found' };
    return { data: task };
  } catch (err) {
    return { error: toActionError(err, 'Failed to retrieve task') };
  }
}

export async function createTaskAction(
  projectId: string,
  data: {
    title: string;
    description?: string;
    status_id: string;
    priority?: Priority;
    assignee?: string;
    due_date?: string | null;
    tags?: string[];
  }
): Promise<ActionResult<Task>> {
  try {
    if (!projectId) return { error: 'Project ID is required' };

    // --- Server-side validation (independent of UI checks) ---
    // Title: required non-empty after trim.
    if (data?.title === undefined) {
      return { error: 'Task title is required' };
    }
    const taskErr = validateTaskInput(data);
    if (taskErr) return { error: taskErr };

    // status_id: required and must belong to THIS project (FK + cross-project check).
    if (!data.status_id || typeof data.status_id !== 'string') {
      return { error: 'status_id is required' };
    }
    const { getStatusesByProject } = await import('@/lib/db');
    const statuses = await getStatusesByProject(projectId);
    if (statuses.length === 0) {
      return { error: 'Project not found or has no statuses' };
    }
    if (!validateStatusBelongsToProject(data.status_id, statuses)) {
      return { error: 'Invalid status: not part of this project' };
    }

    // Tags must be an array of strings if provided.
    if (data.tags !== undefined && !Array.isArray(data.tags)) {
      return { error: 'tags must be an array of strings' };
    }

    const task = await dbCreateTask(projectId, data);
    return { data: task };
  } catch (err) {
    return { error: toActionError(err, 'Failed to create task') };
  }
}

export async function updateTaskAction(
  id: string,
  updates: {
    title?: string;
    description?: string | null;
    status_id?: string;
    priority?: Priority;
    assignee?: string | null;
    due_date?: string | null;
    tags?: string[];
  }
): Promise<ActionResult<Task>> {
  try {
    if (!id) return { error: 'Task ID is required' };

    // --- Server-side validation (independent of UI checks) ---
    const taskErr = validateTaskInput(updates);
    if (taskErr) return { error: taskErr };

    // Cross-project status check: the new status must belong to the task's own project.
    if (updates.status_id !== undefined) {
      const { getTaskById, getStatusesByProject } = await import('@/lib/db');
      const existingTask = await getTaskById(id);
      if (!existingTask) return { error: 'Task not found' };
      const statuses = await getStatusesByProject(existingTask.project_id);
      if (!validateStatusBelongsToProject(updates.status_id, statuses)) {
        return { error: 'Invalid status: not part of this project' };
      }
    }

    if (updates.tags !== undefined && !Array.isArray(updates.tags)) {
      return { error: 'tags must be an array of strings' };
    }

    const task = await dbUpdateTask(id, updates);
    return { data: task };
  } catch (err) {
    return { error: toActionError(err, 'Failed to update task') };
  }
}

export async function deleteTaskAction(id: string): Promise<ActionResult<{ success: boolean }>> {
  try {
    if (!id) return { error: 'Task ID is required' };
    await dbDeleteTask(id);
    return { data: { success: true } };
  } catch (err) {
    return { error: toActionError(err, 'Failed to delete task') };
  }
}
