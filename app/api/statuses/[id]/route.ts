import { NextResponse } from 'next/server';
import { updateStatus, deleteStatus } from '@/lib/db';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim().length === 0)) {
      return NextResponse.json({ error: 'Validation Error', message: 'Status name cannot be empty' }, { status: 400 });
    }

    const status = await updateStatus(id, body);
    return NextResponse.json({ data: status });
  } catch (error: any) {
    console.error('Failed to update status:', error);
    return NextResponse.json({ error: 'Failed to update status', message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Validation Error', message: 'projectId query parameter is required' }, { status: 400 });
    }

    await deleteStatus(id, projectId);
    return NextResponse.json({ success: true, message: 'Status deleted and tasks reassigned to fallback' });
  } catch (error: any) {
    console.error('Failed to delete status:', error);
    return NextResponse.json({ error: 'Failed to delete status', message: error.message }, { status: 500 });
  }
}
