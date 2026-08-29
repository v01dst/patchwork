'use server';

import {
  getStatusesByProject as dbGetStatusesByProject,
  createStatus as dbCreateStatus,
  updateStatus as dbUpdateStatus,
  reorderStatuses as dbReorderStatuses,
  deleteStatus as dbDeleteStatus,
} from '@/lib/db';
import { Status } from '@/types';
import { ActionResult } from './projects';

export async function getStatusesByProjectAction(projectId: string): Promise<ActionResult<Status[]>> {
  try {
    if (!projectId) return { error: 'Project ID is required' };
    const statuses = await dbGetStatusesByProject(projectId);
    return { data: statuses };
  } catch (err: any) {
    console.error('getStatusesByProjectAction error:', err);
    return { error: err.message || 'Failed to retrieve statuses' };
  }
}

export async function createStatusAction(
  projectId: string,
  data: { name: string; color?: string }
): Promise<ActionResult<Status>> {
  try {
    if (!projectId) return { error: 'Project ID is required' };
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      return { error: 'Status name is required' };
    }
    const status = await dbCreateStatus(projectId, data.name, data.color);
    return { data: status };
  } catch (err: any) {
    console.error('createStatusAction error:', err);
    return { error: err.message || 'Failed to create status' };
  }
}

export async function updateStatusAction(
  id: string,
  data: { name?: string; color?: string }
): Promise<ActionResult<Status>> {
  try {
    if (!id) return { error: 'Status ID is required' };
    if (data.name !== undefined && (typeof data.name !== 'string' || data.name.trim().length === 0)) {
      return { error: 'Status name cannot be empty' };
    }
    const status = await dbUpdateStatus(id, data);
    return { data: status };
  } catch (err: any) {
    console.error('updateStatusAction error:', err);
    return { error: err.message || 'Failed to update status' };
  }
}

export async function reorderStatusesAction(
  projectId: string,
  orderedStatusIds: string[]
): Promise<ActionResult<Status[]>> {
  try {
    if (!projectId) return { error: 'Project ID is required' };
    if (!Array.isArray(orderedStatusIds) || orderedStatusIds.length === 0) {
      return { error: 'orderedStatusIds array is required' };
    }
    const statuses = await dbReorderStatuses(projectId, orderedStatusIds);
    return { data: statuses };
  } catch (err: any) {
    console.error('reorderStatusesAction error:', err);
    return { error: err.message || 'Failed to reorder statuses' };
  }
}

export async function deleteStatusAction(
  id: string,
  projectId: string
): Promise<ActionResult<{ success: boolean }>> {
  try {
    if (!id) return { error: 'Status ID is required' };
    if (!projectId) return { error: 'Project ID is required' };
    await dbDeleteStatus(id, projectId);
    return { data: { success: true } };
  } catch (err: any) {
    console.error('deleteStatusAction error:', err);
    return { error: err.message || 'Failed to delete status' };
  }
}
