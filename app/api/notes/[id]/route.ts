import { NextResponse } from 'next/server';
import { deleteNote } from '@/lib/db';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteNote(id);
    return NextResponse.json({ success: true, message: 'Note deleted' });
  } catch (error: any) {
    console.error('Failed to delete note:', error);
    return NextResponse.json({ error: 'Failed to delete note', message: error.message }, { status: 500 });
  }
}
