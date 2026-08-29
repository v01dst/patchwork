'use server';

import {
  getProjects as dbGetProjects,
  getProjectById as dbGetProjectById,
  createProject as dbCreateProject,
  updateProject as dbUpdateProject,
  deleteProject as dbDeleteProject,
} from '@/lib/db';
import { ProjectWithStats, Project } from '@/types';

export type ActionResult<T> = {
  data?: T;
  error?: string;
};

export async function getProjectsAction(): Promise<ActionResult<ProjectWithStats[]>> {
  try {
    const projects = await dbGetProjects();
    return { data: projects };
  } catch (err: any) {
    console.error('getProjectsAction error:', err);
    return { error: err.message || 'Failed to retrieve projects' };
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
  } catch (err: any) {
    console.error('getProjectByIdAction error:', err);
    return { error: err.message || 'Failed to retrieve project' };
  }
}

export async function createProjectAction(data: { name: string; description?: string }): Promise<ActionResult<Project>> {
  try {
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      return { error: 'Project name is required' };
    }
    const project = await dbCreateProject(data.name, data.description);
    return { data: project };
  } catch (err: any) {
    console.error('createProjectAction error:', err);
    return { error: err.message || 'Failed to create project' };
  }
}

export async function updateProjectAction(
  id: string,
  data: { name?: string; description?: string }
): Promise<ActionResult<Project>> {
  try {
    if (!id) return { error: 'Project ID is required' };
    if (data.name !== undefined && (typeof data.name !== 'string' || data.name.trim().length === 0)) {
      return { error: 'Project name cannot be empty' };
    }
    const updated = await dbUpdateProject(id, data);
    return { data: updated };
  } catch (err: any) {
    console.error('updateProjectAction error:', err);
    return { error: err.message || 'Failed to update project' };
  }
}

export async function deleteProjectAction(id: string): Promise<ActionResult<{ success: boolean }>> {
  try {
    if (!id) return { error: 'Project ID is required' };
    await dbDeleteProject(id);
    return { data: { success: true } };
  } catch (err: any) {
    console.error('deleteProjectAction error:', err);
    return { error: err.message || 'Failed to delete project' };
  }
}
