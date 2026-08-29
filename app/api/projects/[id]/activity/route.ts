/**
 * NOTE: This Route Handler is an optional, protected external-integration surface.
 * It is NOT used by the Patchwork frontend application (which uses Next.js Server Actions).
 * External clients must authenticate via PATCHWORK_API_SECRET.
 */
import { NextResponse } from 'next/server';
import { getActivityByProject } from '@/lib/db';
import { requireApiSecret } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireApiSecret(request);
  if (!auth.authorized) return auth.response!;

  try {
    const { id } = await params;
    const activity = await getActivityByProject(id);
    return NextResponse.json({ data: activity });
  } catch (error: any) {
    console.error('Failed to get activity:', error);
    return NextResponse.json({ error: 'Failed to retrieve activity', message: error.message }, { status: 500 });
  }
}
