import { NextResponse } from 'next/server';
import { getNotesByProject, createNote } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const notes = await getNotesByProject(id);
    return NextResponse.json({ data: notes });
  } catch (error: any) {
    console.error('Failed to get notes:', error);
    return NextResponse.json({ error: 'Failed to retrieve notes', message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();

    if (!body.content || typeof body.content !== 'string' || body.content.trim().length === 0) {
      return NextResponse.json({ error: 'Validation Error', message: 'Note content is required' }, { status: 400 });
    }

    const note = await createNote(projectId, body.content);
    return NextResponse.json({ data: note }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create note:', error);
    return NextResponse.json({ error: 'Failed to create note', message: error.message }, { status: 500 });
  }
}
