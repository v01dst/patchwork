import { NextResponse } from 'next/server';
import { getActivityByProject } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const activity = await getActivityByProject(id);
    return NextResponse.json({ data: activity });
  } catch (error: any) {
    console.error('Failed to get activity:', error);
    return NextResponse.json({ error: 'Failed to retrieve activity', message: error.message }, { status: 500 });
  }
}
