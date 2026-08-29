import { NextResponse } from 'next/server';
import { getTasksByProject, createTask } from '@/lib/db';
import { ALLOWED_PRIORITIES } from '@/lib/constants';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const tasks = await getTasksByProject(id);
    return NextResponse.json({ data: tasks });
  } catch (error: any) {
    console.error('Failed to get tasks:', error);
    return NextResponse.json({ error: 'Failed to retrieve tasks', message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();

    if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
      return NextResponse.json({ error: 'Validation Error', message: 'Task title is required' }, { status: 400 });
    }

    if (!body.status_id || typeof body.status_id !== 'string') {
      return NextResponse.json({ error: 'Validation Error', message: 'status_id is required' }, { status: 400 });
    }

    if (body.priority && !ALLOWED_PRIORITIES.includes(body.priority)) {
      return NextResponse.json({ error: 'Validation Error', message: `Invalid priority. Must be one of: ${ALLOWED_PRIORITIES.join(', ')}` }, { status: 400 });
    }

    if (body.due_date && isNaN(Date.parse(body.due_date))) {
      return NextResponse.json({ error: 'Validation Error', message: 'Invalid due_date format' }, { status: 400 });
    }

    const task = await createTask(projectId, body);
    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create task:', error);
    return NextResponse.json({ error: 'Failed to create task', message: error.message }, { status: 500 });
  }
}
