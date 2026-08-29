import { NextResponse } from 'next/server';
import { getTaskById, updateTask, deleteTask } from '@/lib/db';
import { ALLOWED_PRIORITIES } from '@/lib/constants';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const task = await getTaskById(id);
    if (!task) {
      return NextResponse.json({ error: 'Not Found', message: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json({ data: task });
  } catch (error: any) {
    console.error('Failed to fetch task:', error);
    return NextResponse.json({ error: 'Failed to retrieve task', message: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body.title !== undefined && (typeof body.title !== 'string' || body.title.trim().length === 0)) {
      return NextResponse.json({ error: 'Validation Error', message: 'Task title cannot be empty' }, { status: 400 });
    }

    if (body.priority !== undefined && !ALLOWED_PRIORITIES.includes(body.priority)) {
      return NextResponse.json({ error: 'Validation Error', message: `Invalid priority. Must be one of: ${ALLOWED_PRIORITIES.join(', ')}` }, { status: 400 });
    }

    if (body.due_date && isNaN(Date.parse(body.due_date))) {
      return NextResponse.json({ error: 'Validation Error', message: 'Invalid due_date format' }, { status: 400 });
    }

    const task = await updateTask(id, body);
    return NextResponse.json({ data: task });
  } catch (error: any) {
    console.error('Failed to update task:', error);
    return NextResponse.json({ error: 'Failed to update task', message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteTask(id);
    return NextResponse.json({ success: true, message: 'Task deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete task:', error);
    return NextResponse.json({ error: 'Failed to delete task', message: error.message }, { status: 500 });
  }
}
