'use server';

import {
  getStatusesByProject as dbGetStatusesByProject,
  createStatus as dbCreateStatus,
  updateStatus as dbUpdateStatus,
  reorderStatuses as dbReorderStatuses,
  deleteStatus as dbDeleteStatus,
} from '@/lib/db';
import { Status } from '@/types';
import { validateRequiredText } from '@/lib/validate';
import { ActionResult, toActionError } from './projects';

export async function getStatusesByProjectAction(projectId: string): Promise<ActionResult<Status[]>> {
  try {
    if (!projectId) return { error: 'Project ID is required' };
    const statuses = await dbGetStatusesByProject(projectId);
    return { data: statuses };
  } catch (err) {
    return { error: toActionError(err, 'Failed to retrieve statuses') };
  }
}

export async function createStatusAction(
  projectId: string,
  data: { name: string; color?: string }
): Promise<ActionResult<Status>> {
  try {
    if (!projectId) return { error: 'Project ID is required' };
    const nameErr = validateRequiredText(data?.name, 'Status name');
    if (nameErr) return { error: nameErr };

    const status = await dbCreateStatus(projectId, data.name, data.color);
    return { data: status };
  } catch (err) {
    return { error: toActionError(err, 'Failed to create status') };
  }
}

export async function updateStatusAction(
  id: string,
  data: { name?: string; color?: string }
): Promise<ActionResult<Status>> {
  try {
    if (!id) return { error: 'Status ID is required' };
    if (data.name !== undefined) {
      const nameErr = validateRequiredText(data.name, 'Status name');
      if (nameErr) return { error: nameErr };
    }
    const status = await dbUpdateStatus(id, data);
    return { data: status };
  } catch (err) {
    return { error: toActionError(err, 'Failed to update status') };
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
  } catch (err) {
    return { error: toActionError(err, 'Failed to reorder statuses') };
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
  } catch (err) {
    return { error: toActionError(err, 'Failed to delete status') };
  }
}
