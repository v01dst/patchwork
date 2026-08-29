'use server';

import {
  getNotesByProject as dbGetNotesByProject,
  createNote as dbCreateNote,
  deleteNote as dbDeleteNote,
} from '@/lib/db';
import { Note } from '@/types';
import { validateRequiredText } from '@/lib/validate';
import { ActionResult, toActionError } from './projects';

export async function getNotesByProjectAction(projectId: string): Promise<ActionResult<Note[]>> {
  try {
    if (!projectId) return { error: 'Project ID is required' };
    const notes = await dbGetNotesByProject(projectId);
    return { data: notes };
  } catch (err) {
    return { error: toActionError(err, 'Failed to retrieve notes') };
  }
}

export async function createNoteAction(
  projectId: string,
  content: string
): Promise<ActionResult<Note>> {
  try {
    if (!projectId) return { error: 'Project ID is required' };
    const contentErr = validateRequiredText(content, 'Note content');
    if (contentErr) return { error: contentErr };

    const note = await dbCreateNote(projectId, content);
    return { data: note };
  } catch (err) {
    return { error: toActionError(err, 'Failed to create note') };
  }
}

export async function deleteNoteAction(id: string): Promise<ActionResult<{ success: boolean }>> {
  try {
    if (!id) return { error: 'Note ID is required' };
    await dbDeleteNote(id);
    return { data: { success: true } };
  } catch (err) {
    return { error: toActionError(err, 'Failed to delete note') };
  }
}
