'use server';

import {
  getTasksByProject as dbGetTasksByProject,
  getTaskById as dbGetTaskById,
  createTask as dbCreateTask,
  updateTask as dbUpdateTask,
  deleteTask as dbDeleteTask,
} from '@/lib/db';
import { ALLOWED_PRIORITIES } from '@/lib/constants';
import { Task, Priority } from '@/types';
import { ActionResult } from './projects';

export async function getTasksByProjectAction(projectId: string): Promise<ActionResult<Task[]>> {
  try {
    if (!projectId) return { error: 'Project ID is required' };
    const tasks = await dbGetTasksByProject(projectId);
    return { data: tasks };
  } catch (err: any) {
    console.error('getTasksByProjectAction error:', err);
    return { error: err.message || 'Failed to retrieve tasks' };
  }
}

export async function getTaskByIdAction(id: string): Promise<ActionResult<Task>> {
  try {
    if (!id) return { error: 'Task ID is required' };
    const task = await dbGetTaskById(id);
    if (!task) return { error: 'Task not found' };
    return { data: task };
  } catch (err: any) {
    console.error('getTaskByIdAction error:', err);
    return { error: err.message || 'Failed to retrieve task' };
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
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
      return { error: 'Task title is required' };
    }
    if (!data.status_id) {
      return { error: 'status_id is required' };
    }
    if (data.priority && !ALLOWED_PRIORITIES.includes(data.priority)) {
      return { error: `Invalid priority. Must be one of: ${ALLOWED_PRIORITIES.join(', ')}` };
    }
    if (data.due_date && isNaN(Date.parse(data.due_date))) {
      return { error: 'Invalid due_date format' };
    }

    const task = await dbCreateTask(projectId, data);
    return { data: task };
  } catch (err: any) {
    console.error('createTaskAction error:', err);
    return { error: err.message || 'Failed to create task' };
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
    if (updates.title !== undefined && (typeof updates.title !== 'string' || updates.title.trim().length === 0)) {
      return { error: 'Task title cannot be empty' };
    }
    if (updates.priority !== undefined && !ALLOWED_PRIORITIES.includes(updates.priority)) {
      return { error: `Invalid priority. Must be one of: ${ALLOWED_PRIORITIES.join(', ')}` };
    }
    if (updates.due_date && isNaN(Date.parse(updates.due_date))) {
      return { error: 'Invalid due_date format' };
    }

    const task = await dbUpdateTask(id, updates);
    return { data: task };
  } catch (err: any) {
    console.error('updateTaskAction error:', err);
    return { error: err.message || 'Failed to update task' };
  }
}

export async function deleteTaskAction(id: string): Promise<ActionResult<{ success: boolean }>> {
  try {
    if (!id) return { error: 'Task ID is required' };
    await dbDeleteTask(id);
    return { data: { success: true } };
  } catch (err: any) {
    console.error('deleteTaskAction error:', err);
    return { error: err.message || 'Failed to delete task' };
  }
}
