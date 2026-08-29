import { NextResponse } from 'next/server';
import { getProjectById, updateProject, deleteProject } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const project = await getProjectById(id);
    if (!project) {
      return NextResponse.json({ error: 'Not Found', message: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json({ data: project });
  } catch (error: any) {
    console.error('Failed to fetch project:', error);
    return NextResponse.json({ error: 'Failed to retrieve project', message: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim().length === 0)) {
      return NextResponse.json({ error: 'Validation Error', message: 'Project name cannot be empty' }, { status: 400 });
    }

    const updated = await updateProject(id, body);
    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error('Failed to update project:', error);
    return NextResponse.json({ error: 'Failed to update project', message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteProject(id);
    return NextResponse.json({ success: true, message: 'Project deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete project:', error);
    return NextResponse.json({ error: 'Failed to delete project', message: error.message }, { status: 500 });
  }
}
