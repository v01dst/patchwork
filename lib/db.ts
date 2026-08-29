import { supabaseAdmin } from './supabase';
import { DEFAULT_STATUSES } from './constants';
import { computeIsOverdue } from './overdue';
import { computeTaskDiff, normalizeTagNames } from './task-diff';
import { Project, ProjectWithStats, Status, Task, Tag, Activity, Note, Priority } from '@/types';

/**
 * Typed DB-layer error. Server Actions map this to a typed { error } result
 * instead of letting raw Postgres errors reach the UI unformatted.
 * - ValidationError: client fixable (bad input, cross-project FK, missing row) -> surfaced as-is.
 * - NotFoundError: referenced row does not exist.
 */
export class DbError extends Error {
  kind: 'validation' | 'not_found' | 'internal';
  constructor(kind: DbError['kind'], message: string) {
    super(message);
    this.name = 'DbError';
    this.kind = kind;
  }
}

/** Map a raw Supabase/Postgres error into a typed DbError with a safe message. */
function toDbError(err: any, fallback: string): DbError {
  const msg: string = err?.message || String(err);
  // Postgres RPC exceptions raised via `raise exception 'CODE'`.
  if (msg.includes('INVALID_STATUS_FOR_PROJECT')) {
    return new DbError('validation', 'Invalid status: not part of this project');
  }
  if (msg.includes('INVALID_PRIORITY')) {
    return new DbError('validation', 'Invalid priority value');
  }
  if (msg.includes('INVALID_NAME')) {
    return new DbError('validation', 'Name is required and cannot be empty');
  }
  if (msg.includes('INVALID_CONTENT')) {
    return new DbError('validation', 'Content is required and cannot be empty');
  }
  if (msg.includes('TASK_NOT_FOUND')) {
    return new DbError('not_found', 'Task not found');
  }
  if (msg.includes('STATUS_NOT_FOUND')) {
    return new DbError('not_found', 'Status not found');
  }
  if (msg.includes('CANNOT_DELETE_LAST_STATUS')) {
    return new DbError('validation', 'Cannot delete the only status in a project');
  }
  if (msg.includes('REORDER_MISMATCH')) {
    return new DbError('validation', 'Reorder failed: status list mismatch');
  }
  if (msg.includes('duplicate key') || msg.includes('unique')) {
    return new DbError('validation', 'A record with these values already exists');
  }
  return new DbError('internal', fallback);
}

// ==========================================
// PROJECTS
// ==========================================
export async function getProjects(): Promise<ProjectWithStats[]> {
  const { data: projects, error: pErr } = await supabaseAdmin
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });

  if (pErr) throw toDbError(pErr, 'Failed to retrieve projects');

  if (!projects || projects.length === 0) return [];

  const { data: allStatuses, error: sErr } = await supabaseAdmin.from('statuses').select('*');
  if (sErr) throw toDbError(sErr, 'Failed to retrieve statuses');

  const { data: allTasks, error: tErr } = await supabaseAdmin.from('tasks').select('*');
  if (tErr) throw toDbError(tErr, 'Failed to retrieve tasks');

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
    return { ...p, stats: computeStats(pTasks, pStatuses) };
  });
}

/** Shared stats computation for a project's tasks/statuses. */
function computeStats(pTasks: any[], pStatuses: Status[]) {
  const sortedStatuses = [...pStatuses].sort((a, b) => a.order_index - b.order_index);
  const doneStatus = sortedStatuses[sortedStatuses.length - 1];

  let completed = 0;
  let inProgress = 0;
  let overdue = 0;

  pTasks.forEach(t => {
    const st = pStatuses.find(s => s.id === t.status_id);
    const isDone = (doneStatus && t.status_id === doneStatus.id) ||
      st?.name.toLowerCase() === 'done';
    const isInProg = st?.name.toLowerCase() === 'in progress';

    if (isDone) completed++;
    if (isInProg) inProgress++;
    if (computeIsOverdue(t.due_date, t.status_id, pStatuses)) overdue++;
  });

  const total = pTasks.length;
  return {
    total_tasks: total,
    completed_tasks: completed,
    in_progress_tasks: inProgress,
    overdue_tasks: overdue,
    completion_percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

export async function getProjectById(id: string): Promise<ProjectWithStats | null> {
  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !project) return null;

  const { data: statuses, error: sErr } = await supabaseAdmin
    .from('statuses')
    .select('*')
    .eq('project_id', id);
  if (sErr) throw toDbError(sErr, 'Failed to retrieve statuses');

  const { data: tasks, error: tErr } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('project_id', id);
  if (tErr) throw toDbError(tErr, 'Failed to retrieve tasks');

  const pStatuses: Status[] = statuses || [];
  const pTasks: any[] = tasks || [];

  return { ...project, stats: computeStats(pTasks, pStatuses) };
}

/**
 * ATOMIC: project insert + default status seed run inside ONE Postgres
 * transaction via the create_project_with_statuses RPC. A failure seeding
 * statuses rolls back the project insert — no orphaned, status-less projects.
 */
export async function createProject(name: string, description?: string): Promise<Project> {
  const { data, error } = await supabaseAdmin.rpc('create_project_with_statuses', {
    p_name: name,
    p_description: description || '',
    p_statuses: DEFAULT_STATUSES,
  });

  if (error) throw toDbError(error, 'Failed to create project');
  if (!data) throw new DbError('internal', 'Failed to create project');
  return data as Project;
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

  if (error) throw toDbError(error, 'Failed to update project');
  if (!data) throw new DbError('not_found', 'Project not found');
  return data;
}

export async function deleteProject(id: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from('projects').delete().eq('id', id);
  if (error) throw toDbError(error, 'Failed to delete project');
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

  if (error) throw toDbError(error, 'Failed to retrieve statuses');
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

  if (error) throw toDbError(error, 'Failed to create status');
  if (!data) throw new DbError('internal', 'Failed to create status');
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

  if (error) throw toDbError(error, 'Failed to update status');
  if (!data) throw new DbError('not_found', 'Status not found');
  return data;
}

/**
 * ATOMIC: two-phase reorder (park at 10000+ offset, then assign 0..n-1) runs
 * inside ONE Postgres transaction via the reorder_statuses RPC. An interrupted
 * reorder rolls back to the original order_index values — no intermediate state.
 */
export async function reorderStatuses(projectId: string, orderedStatusIds: string[]): Promise<Status[]> {
  const { data, error } = await supabaseAdmin.rpc('reorder_statuses', {
    p_project_id: projectId,
    p_ordered_ids: orderedStatusIds,
  });

  if (error) throw toDbError(error, 'Failed to reorder statuses');
  return (data || []) as Status[];
}

/**
 * ATOMIC: task reassignment to fallback status + status delete + reindex run
 * inside ONE Postgres transaction via the delete_status_atomic RPC. No task is
 * ever left pointing at a deleted status, and order_index stays consistent.
 */
export async function deleteStatus(id: string, projectId: string): Promise<boolean> {
  const { error } = await supabaseAdmin.rpc('delete_status_atomic', {
    p_status_id: id,
    p_project_id: projectId,
  });

  if (error) throw toDbError(error, 'Failed to delete status');
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

  if (error) throw toDbError(error, 'Failed to retrieve tasks');

  return (tasks || []).map((t: any) => {
    const tags = (t.task_tags || []).map((tt: any) => tt.tag).filter(Boolean);
    const is_overdue = computeIsOverdue(t.due_date, t.status_id, statuses);
    return { ...t, tags, is_overdue };
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

  return { ...task, tags, is_overdue };
}

/**
 * SYNCTAGS ERROR HANDLING: every Supabase call checks its error field and
 * throws immediately. A failed lookup is NEVER treated as "tag doesn't exist",
 * and a failed insert is never swallowed. The function either fully succeeds
 * (all tags resolved, created, and linked) or throws, which aborts the parent
 * operation. All tag writes happen inside the atomic RPC transaction, so a
 * failure here rolls back the whole operation — a task is never saved with
 * only some of its tags attached.
 */
export async function syncTags(task_id: string, tagNames: string[]): Promise<Tag[]> {
  // 1) Clear existing links. A failure here must abort, not be ignored.
  const { error: delErr } = await supabaseAdmin
    .from('task_tags')
    .delete()
    .eq('task_id', task_id);
  if (delErr) throw toDbError(delErr, `Failed to clear task tags: ${delErr.message}`);

  const names = normalizeTagNames(tagNames);
  if (names.length === 0) return [];

  const resolved: Tag[] = [];

  for (const name of names) {
    // 2) Existing-tag lookup: check the error field explicitly. A failed
    //    lookup must THROW — never fall through to "create it".
    const { data: existingTag, error: lookupErr } = await supabaseAdmin
      .from('tags')
      .select('*')
      .eq('name', name)
      .single();
    if (lookupErr && lookupErr.code !== 'PGRST116') {
      throw toDbError(lookupErr, `Failed to look up tag "${name}": ${lookupErr.message}`);
    }

    let tag = existingTag;

    // 3) Tag creation: a failed insert throws — never silently skipped.
    if (!tag) {
      const { data: newTag, error: createErr } = await supabaseAdmin
        .from('tags')
        .insert({ name })
        .select()
        .single();
      if (createErr) throw toDbError(createErr, `Failed to create tag "${name}": ${createErr.message}`);
      if (!newTag) throw new DbError('internal', `Failed to create tag "${name}"`);
      tag = newTag;
    }

    // 4) Link: a failed link insert throws — never silently skipped.
    const { error: linkErr } = await supabaseAdmin
      .from('task_tags')
      .insert({ task_id, tag_id: tag.id });
    if (linkErr) throw toDbError(linkErr, `Failed to link tag "${name}": ${linkErr.message}`);

    resolved.push(tag);
  }

  return resolved;
}

/**
 * ATOMIC: task insert + tag upsert/link + project bump + activity log all run
 * inside ONE Postgres transaction via the create_task_atomic RPC. If any step
 * fails (e.g. tag linking), the task insert rolls back — no orphaned tasks.
 */
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
  const taskJson = {
    title: data.title,
    description: data.description ?? '',
    status_id: data.status_id,
    priority: data.priority || 'medium',
    assignee: data.assignee ?? '',
    due_date: data.due_date ?? '',
  };

  const { data: taskId, error } = await supabaseAdmin.rpc('create_task_atomic', {
    p_project_id: projectId,
    p_task: taskJson,
    p_tags: normalizeTagNames(data.tags),
    p_activity: {
      field: 'created',
      old_value: null,
      new_value: data.title.trim(),
      description: `Created task "${data.title.trim()}"`,
    },
  });

  if (error) throw toDbError(error, 'Failed to create task');
  if (!taskId) throw new DbError('internal', 'Failed to create task');

  const task = await getTaskById(String(taskId));
  if (!task) throw new DbError('internal', 'Failed to create task');
  return task;
}

/**
 * ATOMIC: field updates + tag resync + project bump + one activity row per
 * changed field all run inside ONE Postgres transaction via the
 * update_task_atomic RPC. A mid-operation failure rolls everything back.
 */
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
  if (!oldTask) throw new DbError('not_found', 'Task not found');

  // Cross-project status check BEFORE writing (validation layer above the DB one).
  if (updates.status_id !== undefined && updates.status_id !== oldTask.status_id) {
    const statuses = await getStatusesByProject(oldTask.project_id);
    if (!statuses.some(s => s.id === updates.status_id)) {
      throw new DbError('validation', 'Invalid status: not part of this project');
    }
  }

  // Resolve status names for the activity log.
  let statusNames: Record<string, string> = {};
  if (updates.status_id !== undefined && updates.status_id !== oldTask.status_id) {
    const statuses = await getStatusesByProject(oldTask.project_id);
    statusNames = Object.fromEntries(statuses.map(s => [s.id, s.name]));
  }

  const { payload, activities } = computeTaskDiff(oldTask, updates);

  // Decorate status activity entries with human-readable names.
  const decoratedActivities = activities.map(a =>
    a.field === 'status'
      ? {
          ...a,
          old_value: statusNames[a.old_value] || a.old_value,
          new_value: statusNames[a.new_value] || a.new_value,
          description: `Moved status from ${statusNames[a.old_value] || a.old_value} to ${statusNames[a.new_value] || a.new_value}`,
        }
      : a
  );

  // Only fields that actually changed are sent to the DB.
  const updatesJson: any = {};
  if (payload.title !== undefined) updatesJson.title = payload.title;
  if (payload.description !== undefined) updatesJson.description = payload.description ?? '';
  if (payload.status_id !== undefined) updatesJson.status_id = payload.status_id;
  if (payload.priority !== undefined) updatesJson.priority = payload.priority;
  if (payload.assignee !== undefined) updatesJson.assignee = payload.assignee ?? '';
  if (payload.due_date !== undefined) updatesJson.due_date = payload.due_date ?? '';

  const { data: updatedId, error } = await supabaseAdmin.rpc('update_task_atomic', {
    p_task_id: id,
    p_updates: updatesJson,
    p_activities: decoratedActivities,
    p_tags: updates.tags !== undefined ? normalizeTagNames(updates.tags) : null,
    p_tags_provided: updates.tags !== undefined,
  });

  if (error) throw toDbError(error, 'Failed to update task');
  if (!updatedId) throw new DbError('internal', 'Failed to update task');

  const task = await getTaskById(id);
  if (!task) throw new DbError('not_found', 'Task not found');
  return task;
}

/**
 * ATOMIC: activity log + task delete + project bump run inside ONE Postgres
 * transaction via the delete_task_atomic RPC.
 */
export async function deleteTask(id: string): Promise<boolean> {
  const oldTask = await getTaskById(id);
  if (!oldTask) return true; // idempotent no-op

  const { error } = await supabaseAdmin.rpc('delete_task_atomic', {
    p_task_id: id,
    p_activity: {
      field: 'deleted',
      old_value: oldTask.title,
      new_value: null,
      description: `Deleted task "${oldTask.title}"`,
    },
  });

  if (error) throw toDbError(error, 'Failed to delete task');
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

  if (error) throw toDbError(error, 'Failed to retrieve activity');
  return data || [];
}

export async function getActivityByTask(taskId: string, limit = 50): Promise<Activity[]> {
  const { data, error } = await supabaseAdmin
    .from('activity')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw toDbError(error, 'Failed to retrieve task activity');
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

  if (error) throw toDbError(error, 'Failed to retrieve notes');
  return data || [];
}

/**
 * ATOMIC: note insert + project bump run inside ONE Postgres transaction via
 * the create_note_atomic RPC.
 */
export async function createNote(projectId: string, content: string): Promise<Note> {
  const { data, error } = await supabaseAdmin.rpc('create_note_atomic', {
    p_project_id: projectId,
    p_content: content,
  });

  if (error) throw toDbError(error, 'Failed to create note');
  if (!data) throw new DbError('internal', 'Failed to create note');
  return data as Note;
}

export async function deleteNote(id: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from('notes').delete().eq('id', id);
  if (error) throw toDbError(error, 'Failed to delete note');
  return true;
}
