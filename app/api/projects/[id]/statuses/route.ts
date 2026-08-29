import { NextResponse } from 'next/server';
import { getStatusesByProject, createStatus, reorderStatuses } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const statuses = await getStatusesByProject(id);
    return NextResponse.json({ data: statuses });
  } catch (error: any) {
    console.error('Failed to get statuses:', error);
    return NextResponse.json({ error: 'Failed to retrieve statuses', message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();

    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json({ error: 'Validation Error', message: 'Status name is required' }, { status: 400 });
    }

    const status = await createStatus(projectId, body.name, body.color);
    return NextResponse.json({ data: status }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create status:', error);
    return NextResponse.json({ error: 'Failed to create status', message: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();

    if (!Array.isArray(body.orderedStatusIds) || body.orderedStatusIds.length === 0) {
      return NextResponse.json({ error: 'Validation Error', message: 'orderedStatusIds array is required' }, { status: 400 });
    }

    const statuses = await reorderStatuses(projectId, body.orderedStatusIds);
    return NextResponse.json({ data: statuses });
  } catch (error: any) {
    console.error('Failed to reorder statuses:', error);
    return NextResponse.json({ error: 'Failed to reorder statuses', message: error.message }, { status: 500 });
  }
}
