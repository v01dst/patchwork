import { supabaseAdmin } from './supabase';
import { DEFAULT_STATUSES } from './constants';
import { computeIsOverdue } from './overdue';
import { Project, ProjectWithStats, Status, Task, Tag, Activity, Note, Priority } from '@/types';

// ==========================================
// PROJECTS
// ==========================================
export async function getProjects(): Promise<ProjectWithStats[]> {
  const { data: projects, error: pErr } = await supabaseAdmin
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });

  if (pErr) throw pErr;
  if (!projects || projects.length === 0) return [];

  // Fetch statuses and tasks to compute stats
  const { data: allStatuses } = await supabaseAdmin.from('statuses').select('*');
  const { data: allTasks } = await supabaseAdmin.from('tasks').select('*');

  const statusMap = new Map<string, Status[]>();
  (allStatuses || []).forEach(s => {
    const list = statusMap.get(s.project_id) || [];
    list.push(s);
    statusMap.set(s.project_id, list);
  });

  const taskMap = new Map<string, any[]>();
  (allTasks || []).forEach(t => {
    const list = taskMap.get(t.project_id) || [];
    list.push(t);
    taskMap.set(t.project_id, list);
  });

  return projects.map(p => {
    const pStatuses = statusMap.get(p.id) || [];
    const pTasks = taskMap.get(p.id) || [];

    const sortedStatuses = [...pStatuses].sort((a, b) => a.order_index - b.order_index);
    const doneStatus = sortedStatuses[sortedStatuses.length - 1];

    let completed = 0;
    let inProgress = 0;
    let overdue = 0;

    pTasks.forEach(t => {
      const isDone = (doneStatus && t.status_id === doneStatus.id) || 
        pStatuses.find(s => s.id === t.status_id)?.name.toLowerCase() === 'done';
      
      const isInProg = pStatuses.find(s => s.id === t.status_id)?.name.toLowerCase() === 'in progress';

      if (isDone) completed++;
      if (isInProg) inProgress++;
      if (computeIsOverdue(t.due_date, t.status_id, pStatuses)) overdue++;
    });

    const total = pTasks.length;
    const completion_percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      ...p,
      stats: {
        total_tasks: total,
        completed_tasks: completed,
        in_progress_tasks: inProgress,
        overdue_tasks: overdue,
        completion_percentage,
      }
    };
  });
}

export async function getProjectById(id: string): Promise<ProjectWithStats | null> {
  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !project) return null;

  const { data: statuses } = await supabaseAdmin.from('statuses').select('*').eq('project_id', id);
  const { data: tasks } = await supabaseAdmin.from('tasks').select('*').eq('project_id', id);

  const pStatuses = statuses || [];
  const pTasks = tasks || [];

  const sortedStatuses = [...pStatuses].sort((a, b) => a.order_index - b.order_index);
  const doneStatus = sortedStatuses[sortedStatuses.length - 1];

  let completed = 0;
  let inProgress = 0;
  let overdue = 0;

  pTasks.forEach(t => {
    const isDone = (doneStatus && t.status_id === doneStatus.id) || 
      pStatuses.find(s => s.id === t.status_id)?.name.toLowerCase() === 'done';
    
    const isInProg = pStatuses.find(s => s.id === t.status_id)?.name.toLowerCase() === 'in progress';

    if (isDone) completed++;
    if (isInProg) inProgress++;
    if (computeIsOverdue(t.due_date, t.status_id, pStatuses)) overdue++;
  });

  const total = pTasks.length;
  const completion_percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    ...project,
    stats: {
      total_tasks: total,
      completed_tasks: completed,
      in_progress_tasks: inProgress,
      overdue_tasks: overdue,
      completion_percentage,
    }
  };
}

export async function createProject(name: string, description?: string): Promise<Project> {
  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .insert({
      name: name.trim(),
      description: description ? description.trim() : null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  // Seed default 5 statuses
  const statusInserts = DEFAULT_STATUSES.map(s => ({
    project_id: project.id,
    name: s.name,
    order_index: s.order_index,
    color: s.color,
  }));

  const { error: sErr } = await supabaseAdmin.from('statuses').insert(statusInserts);
  if (sErr) throw sErr;

  return project;
}

export async function updateProject(id: string, updates: { name?: string; description?: string }): Promise<Project> {
  const payload: any = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.description !== undefined) payload.description = updates.description.trim();

  const { data, error } = await supabaseAdmin
    .from('projects')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProject(id: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from('projects').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ==========================================
// STATUSES
// ==========================================
export async function getStatusesByProject(projectId: string): Promise<Status[]> {
  const { data, error } = await supabaseAdmin
    .from('statuses')
    .select('*')
    .eq('project_id', projectId)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createStatus(projectId: string, name: string, color?: string): Promise<Status> {
  const statuses = await getStatusesByProject(projectId);
  const nextOrder = statuses.length > 0 ? Math.max(...statuses.map(s => s.order_index)) + 1 : 0;

  const { data, error } = await supabaseAdmin
    .from('statuses')
    .insert({
      project_id: projectId,
      name: name.trim(),
      order_index: nextOrder,
      color: color || '#64748b',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateStatus(id: string, updates: { name?: string; color?: string }): Promise<Status> {
  const payload: any = {};
  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.color !== undefined) payload.color = updates.color.trim();

  const { data, error } = await supabaseAdmin
    .from('statuses')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function reorderStatuses(projectId: string, orderedStatusIds: string[]): Promise<Status[]> {
  // Update order_index in batch / sequential
  // To avoid unique_project_status_order conflicts during reordering, we can use an offset or direct loop
  for (let i = 0; i < orderedStatusIds.length; i++) {
    const id = orderedStatusIds[i];
    await supabaseAdmin
      .from('statuses')
      .update({ order_index: i + 1000 })
      .eq('id', id);
  }

  for (let i = 0; i < orderedStatusIds.length; i++) {
    const id = orderedStatusIds[i];
    await supabaseAdmin
      .from('statuses')
      .update({ order_index: i })
      .eq('id', id);
  }

  return getStatusesByProject(projectId);
}

export async function deleteStatus(id: string, projectId: string): Promise<boolean> {
  const statuses = await getStatusesByProject(projectId);
  if (statuses.length <= 1) {
    throw new Error('Cannot delete the only status in a project.');
  }

  const remainingStatuses = statuses.filter(s => s.id !== id);
  const fallbackStatus = remainingStatuses[0];

  // Move tasks in deleted status to fallback status
  const { error: moveErr } = await supabaseAdmin
    .from('tasks')
    .update({ status_id: fallbackStatus.id, updated_at: new Date().toISOString() })
    .eq('status_id', id);

  if (moveErr) throw moveErr;

  // Delete status
  const { error: delErr } = await supabaseAdmin.from('statuses').delete().eq('id', id);
  if (delErr) throw delErr;

  // Re-index remaining statuses
  const remainingIds = remainingStatuses.map(s => s.id);
  await reorderStatuses(projectId, remainingIds);

  return true;
}

// ==========================================
// TASKS & TAGS & ACTIVITY LOGGING
// ==========================================
export async function getTasksByProject(projectId: string): Promise<Task[]> {
  const statuses = await getStatusesByProject(projectId);

  const { data: tasks, error } = await supabaseAdmin
    .from('tasks')
    .select(`
      *,
      task_tags (
        tag:tags (*)
      ),
      status:statuses (*)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (tasks || []).map((t: any) => {
    const tags = (t.task_tags || []).map((tt: any) => tt.tag).filter(Boolean);
    const is_overdue = computeIsOverdue(t.due_date, t.status_id, statuses);
    return {
      ...t,
      tags,
      is_overdue,
    };
  });
}

export async function getTaskById(id: string): Promise<Task | null> {
  const { data: task, error } = await supabaseAdmin
    .from('tasks')
    .select(`
      *,
      task_tags (
        tag:tags (*)
      ),
      status:statuses (*)
    `)
    .eq('id', id)
    .single();

  if (error || !task) return null;

  const statuses = await getStatusesByProject(task.project_id);
  const tags = (task.task_tags || []).map((tt: any) => tt.tag).filter(Boolean);
  const is_overdue = computeIsOverdue(task.due_date, task.status_id, statuses);

  return {
    ...task,
    tags,
    is_overdue,
  };
}

export async function syncTags(task_id: string, tagNames: string[]): Promise<Tag[]> {
  // Clear existing task_tags
  await supabaseAdmin.from('task_tags').delete().eq('task_id', task_id);

  if (!tagNames || tagNames.length === 0) return [];

  const uniqueNames = Array.from(new Set(tagNames.map(t => t.trim().toLowerCase()))).filter(Boolean);
  const resolvedTags: Tag[] = [];

  for (const name of uniqueNames) {
    // Find or create
    let { data: existingTag } = await supabaseAdmin
      .from('tags')
      .select('*')
      .eq('name', name)
      .single();

    if (!existingTag) {
      const { data: newTag, error: cErr } = await supabaseAdmin
        .from('tags')
        .insert({ name })
        .select()
        .single();
      if (!cErr && newTag) {
        existingTag = newTag;
      }
    }

    if (existingTag) {
      resolvedTags.push(existingTag);
      await supabaseAdmin
        .from('task_tags')
        .insert({ task_id, tag_id: existingTag.id });
    }
  }

  return resolvedTags;
}

export async function createTask(
  projectId: string,
  data: {
    title: string;
    description?: string;
    status_id: string;
    priority?: Priority;
    assignee?: string;
    due_date?: string | null;
    tags?: string[];
  }
): Promise<Task> {
  const { data: task, error } = await supabaseAdmin
    .from('tasks')
    .insert({
      project_id: projectId,
      title: data.title.trim(),
      description: data.description ? data.description.trim() : null,
      status_id: data.status_id,
      priority: data.priority || 'medium',
      assignee: data.assignee ? data.assignee.trim() : null,
      due_date: data.due_date || null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  if (data.tags && data.tags.length > 0) {
    await syncTags(task.id, data.tags);
  }

  // Update project updated_at
  await supabaseAdmin
    .from('projects')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', projectId);

  // Log creation activity
  await supabaseAdmin.from('activity').insert({
    project_id: projectId,
    task_id: task.id,
    field: 'created',
    old_value: null,
    new_value: task.title,
    description: `Created task "${task.title}"`,
  });

  return (await getTaskById(task.id))!;
}

export async function updateTask(
  id: string,
  updates: {
    title?: string;
    description?: string | null;
    status_id?: string;
    priority?: Priority;
    assignee?: string | null;
    due_date?: string | null;
    tags?: string[];
  }
): Promise<Task> {
  const oldTask = await getTaskById(id);
  if (!oldTask) throw new Error('Task not found');

  const payload: any = { updated_at: new Date().toISOString() };
  const activities: any[] = [];

  if (updates.title !== undefined && updates.title.trim() !== oldTask.title) {
    payload.title = updates.title.trim();
    activities.push({
      project_id: oldTask.project_id,
      task_id: id,
      field: 'title',
      old_value: oldTask.title,
      new_value: payload.title,
      description: `Changed title from "${oldTask.title}" to "${payload.title}"`,
    });
  }

  if (updates.description !== undefined && updates.description !== oldTask.description) {
    payload.description = updates.description ? updates.description.trim() : null;
    activities.push({
      project_id: oldTask.project_id,
      task_id: id,
      field: 'description',
      old_value: oldTask.description || '(empty)',
      new_value: payload.description || '(empty)',
      description: `Updated description`,
    });
  }

  if (updates.status_id !== undefined && updates.status_id !== oldTask.status_id) {
    payload.status_id = updates.status_id;
    // Get status names for friendly activity log
    const statuses = await getStatusesByProject(oldTask.project_id);
    const oldStatusName = statuses.find(s => s.id === oldTask.status_id)?.name || oldTask.status_id;
    const newStatusName = statuses.find(s => s.id === updates.status_id)?.name || updates.status_id;

    activities.push({
      project_id: oldTask.project_id,
      task_id: id,
      field: 'status',
      old_value: oldStatusName,
      new_value: newStatusName,
      description: `Moved status from ${oldStatusName} to ${newStatusName}`,
    });
  }

  if (updates.priority !== undefined && updates.priority !== oldTask.priority) {
    payload.priority = updates.priority;
    activities.push({
      project_id: oldTask.project_id,
      task_id: id,
      field: 'priority',
      old_value: oldTask.priority,
      new_value: updates.priority,
      description: `Changed priority from ${oldTask.priority} to ${updates.priority}`,
    });
  }

  if (updates.assignee !== undefined && updates.assignee !== oldTask.assignee) {
    payload.assignee = updates.assignee ? updates.assignee.trim() : null;
    activities.push({
      project_id: oldTask.project_id,
      task_id: id,
      field: 'assignee',
      old_value: oldTask.assignee || 'Unassigned',
      new_value: payload.assignee || 'Unassigned',
      description: `Changed assignee to ${payload.assignee || 'Unassigned'}`,
    });
  }

  if (updates.due_date !== undefined && updates.due_date !== oldTask.due_date) {
    payload.due_date = updates.due_date || null;
    activities.push({
      project_id: oldTask.project_id,
      task_id: id,
      field: 'due_date',
      old_value: oldTask.due_date || 'None',
      new_value: payload.due_date || 'None',
      description: `Changed due date to ${payload.due_date || 'None'}`,
    });
  }

  // Execute Task Update
  const { error: uErr } = await supabaseAdmin
    .from('tasks')
    .update(payload)
    .eq('id', id);

  if (uErr) throw uErr;

  // Sync tags if provided
  if (updates.tags !== undefined) {
    await syncTags(id, updates.tags);
  }

  // Update project's updated_at
  await supabaseAdmin
    .from('projects')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', oldTask.project_id);

  // Insert logged activities
  if (activities.length > 0) {
    await supabaseAdmin.from('activity').insert(activities);
  }

  return (await getTaskById(id))!;
}

export async function deleteTask(id: string): Promise<boolean> {
  const oldTask = await getTaskById(id);
  if (!oldTask) return true;

  // Log activity before deletion
  await supabaseAdmin.from('activity').insert({
    project_id: oldTask.project_id,
    task_id: null,
    field: 'deleted',
    old_value: oldTask.title,
    new_value: null,
    description: `Deleted task "${oldTask.title}"`,
  });

  const { error } = await supabaseAdmin.from('tasks').delete().eq('id', id);
  if (error) throw error;

  await supabaseAdmin
    .from('projects')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', oldTask.project_id);

  return true;
}

// ==========================================
// ACTIVITY TIMELINE
// ==========================================
export async function getActivityByProject(projectId: string, limit = 50): Promise<Activity[]> {
  const { data, error } = await supabaseAdmin
    .from('activity')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getActivityByTask(taskId: string, limit = 50): Promise<Activity[]> {
  const { data, error } = await supabaseAdmin
    .from('activity')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// ==========================================
// NOTES
// ==========================================
export async function getNotesByProject(projectId: string): Promise<Note[]> {
  const { data, error } = await supabaseAdmin
    .from('notes')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createNote(projectId: string, content: string): Promise<Note> {
  const { data, error } = await supabaseAdmin
    .from('notes')
    .insert({
      project_id: projectId,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) throw error;

  await supabaseAdmin
    .from('projects')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', projectId);

  return data;
}

export async function deleteNote(id: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from('notes').delete().eq('id', id);
  if (error) throw error;
  return true;
}
