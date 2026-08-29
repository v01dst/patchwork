import { NextResponse } from 'next/server';
import { getActivityByTask } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const activity = await getActivityByTask(id);
    return NextResponse.json({ data: activity });
  } catch (error: any) {
    console.error('Failed to get task activity:', error);
    return NextResponse.json({ error: 'Failed to retrieve task activity', message: error.message }, { status: 500 });
  }
}
