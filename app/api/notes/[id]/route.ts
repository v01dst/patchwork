/**
 * NOTE: This Route Handler is an optional, protected external-integration surface.
 * It is NOT used by the Patchwork frontend application (which uses Next.js Server Actions).
 * External clients must authenticate via PATCHWORK_API_SECRET.
 */
import { NextResponse } from 'next/server';
import { deleteNote } from '@/lib/db';
import { requireApiSecret } from '@/lib/auth';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireApiSecret(request);
  if (!auth.authorized) return auth.response!;

  try {
    const { id } = await params;
    await deleteNote(id);
    return NextResponse.json({ success: true, message: 'Note deleted' });
  } catch (error: any) {
    console.error('Failed to delete note:', error);
    return NextResponse.json({ error: 'Failed to delete note', message: error.message }, { status: 500 });
  }
}
