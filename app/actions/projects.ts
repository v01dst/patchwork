'use server';

import {
  getProjects as dbGetProjects,
  getProjectById as dbGetProjectById,
  createProject as dbCreateProject,
  updateProject as dbUpdateProject,
  deleteProject as dbDeleteProject,
  DbError,
} from '@/lib/db';
import { ProjectWithStats, Project } from '@/types';
import { validateRequiredText } from '@/lib/validate';

export type ActionResult<T> = {
  data?: T;
  error?: string;
};

/** Convert any thrown error into a typed { error } result. */
export function toActionError(err: unknown, fallback: string): string {
  if (err instanceof DbError) return err.message;
  const msg = err instanceof Error ? err.message : String(err);
  console.error('Server Action error:', msg);
  return fallback;
}

export async function getProjectsAction(): Promise<ActionResult<ProjectWithStats[]>> {
  try {
    const projects = await dbGetProjects();
    return { data: projects };
  } catch (err) {
    return { error: toActionError(err, 'Failed to retrieve projects') };
  }
}

export async function getProjectByIdAction(id: string): Promise<ActionResult<ProjectWithStats>> {
  try {
    if (!id || typeof id !== 'string') {
      return { error: 'Project ID is required' };
    }
    const project = await dbGetProjectById(id);
    if (!project) {
      return { error: 'Project not found' };
    }
    return { data: project };
  } catch (err) {
    return { error: toActionError(err, 'Failed to retrieve project') };
  }
}

export async function createProjectAction(data: { name: string; description?: string }): Promise<ActionResult<Project>> {
  try {
    // Server-side validation, independent of any UI checks.
    const nameErr = validateRequiredText(data?.name, 'Project name');
    if (nameErr) return { error: nameErr };

    const project = await dbCreateProject(data.name, data.description);
    return { data: project };
  } catch (err) {
    return { error: toActionError(err, 'Failed to create project') };
  }
}

export async function updateProjectAction(
  id: string,
  data: { name?: string; description?: string }
): Promise<ActionResult<Project>> {
  try {
    if (!id) return { error: 'Project ID is required' };
    if (data.name !== undefined) {
      const nameErr = validateRequiredText(data.name, 'Project name');
      if (nameErr) return { error: nameErr };
    }
    const updated = await dbUpdateProject(id, data);
    return { data: updated };
  } catch (err) {
    return { error: toActionError(err, 'Failed to update project') };
  }
}

export async function deleteProjectAction(id: string): Promise<ActionResult<{ success: boolean }>> {
  try {
    if (!id) return { error: 'Project ID is required' };
    await dbDeleteProject(id);
    return { data: { success: true } };
  } catch (err) {
    return { error: toActionError(err, 'Failed to delete project') };
  }
}
