'use server';

import {
  getActivityByProject as dbGetActivityByProject,
  getActivityByTask as dbGetActivityByTask,
} from '@/lib/db';
import { Activity } from '@/types';
import { ActionResult } from '@/lib/action-result';

export async function getActivityByProjectAction(
  projectId: string,
  limit = 50
): Promise<ActionResult<Activity[]>> {
  try {
    if (!projectId) return { error: 'Project ID is required' };
    const activity = await dbGetActivityByProject(projectId, limit);
    return { data: activity };
  } catch (err: any) {
    console.error('getActivityByProjectAction error:', err);
    return { error: err.message || 'Failed to retrieve activity' };
  }
}

export async function getActivityByTaskAction(
  taskId: string,
  limit = 50
): Promise<ActionResult<Activity[]>> {
  try {
    if (!taskId) return { error: 'Task ID is required' };
    const activity = await dbGetActivityByTask(taskId, limit);
    return { data: activity };
  } catch (err: any) {
    console.error('getActivityByTaskAction error:', err);
    return { error: err.message || 'Failed to retrieve task activity' };
  }
}
