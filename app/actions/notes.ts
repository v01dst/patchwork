'use server';

import {
  getNotesByProject as dbGetNotesByProject,
  createNote as dbCreateNote,
  deleteNote as dbDeleteNote,
} from '@/lib/db';
import { Note } from '@/types';
import { ActionResult } from './projects';

export async function getNotesByProjectAction(projectId: string): Promise<ActionResult<Note[]>> {
  try {
    if (!projectId) return { error: 'Project ID is required' };
    const notes = await dbGetNotesByProject(projectId);
    return { data: notes };
  } catch (err: any) {
    console.error('getNotesByProjectAction error:', err);
    return { error: err.message || 'Failed to retrieve notes' };
  }
}

export async function createNoteAction(
  projectId: string,
  content: string
): Promise<ActionResult<Note>> {
  try {
    if (!projectId) return { error: 'Project ID is required' };
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return { error: 'Note content is required' };
    }
    const note = await dbCreateNote(projectId, content);
    return { data: note };
  } catch (err: any) {
    console.error('createNoteAction error:', err);
    return { error: err.message || 'Failed to create note' };
  }
}

export async function deleteNoteAction(id: string): Promise<ActionResult<{ success: boolean }>> {
  try {
    if (!id) return { error: 'Note ID is required' };
    await dbDeleteNote(id);
    return { data: { success: true } };
  } catch (err: any) {
    console.error('deleteNoteAction error:', err);
    return { error: err.message || 'Failed to delete note' };
  }
}
