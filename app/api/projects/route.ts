import { NextResponse } from 'next/server';
import { getProjects, createProject } from '@/lib/db';

export async function GET() {
  try {
    const projects = await getProjects();
    return NextResponse.json({ data: projects });
  } catch (error: any) {
    console.error('Failed to get projects:', error);
    return NextResponse.json({ error: 'Failed to retrieve projects', message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json({ error: 'Validation Error', message: 'Project name is required' }, { status: 400 });
    }

    const project = await createProject(body.name, body.description);
    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create project:', error);
    return NextResponse.json({ error: 'Failed to create project', message: error.message }, { status: 500 });
  }
}
