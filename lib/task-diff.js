/**
 * Pure task field-diff logic shared by lib/db.ts (updateTask) and the test suite.
 * Computes the update payload and the automatic activity-log entries for every
 * changed field. Kept framework- and DB-free so tests exercise the REAL logic.
 *
 * @typedef {Object} TaskUpdatePayload
 * @property {string} updated_at
 * @property {string} [title]
 * @property {string|null} [description]
 * @property {string} [status_id]
 * @property {string} [priority]
 * @property {string|null} [assignee]
 * @property {string|null} [due_date]
 *
 * @typedef {Object} ActivityEntry
 * @property {string} field
 * @property {string|null} old_value
 * @property {string|null} new_value
 * @property {string} description
 *
 * @typedef {Object} TaskDiffResult
 * @property {TaskUpdatePayload} payload
 * @property {ActivityEntry[]} activities
 */

/**
 * @param {any} oldTask
 * @param {{title?: string, description?: string|null, status_id?: string, priority?: string, assignee?: string|null, due_date?: string|null}} updates
 * @returns {TaskDiffResult}
 */
function computeTaskDiff(oldTask, updates) {
  const payload = { updated_at: new Date().toISOString() };
  const activities = [];

  if (updates.title !== undefined && updates.title.trim() !== oldTask.title) {
    payload.title = updates.title.trim();
    activities.push({
      field: 'title',
      old_value: oldTask.title,
      new_value: payload.title,
      description: `Changed title from "${oldTask.title}" to "${payload.title}"`,
    });
  }

  if (updates.description !== undefined && updates.description !== oldTask.description) {
    payload.description = updates.description ? updates.description.trim() : null;
    activities.push({
      field: 'description',
      old_value: oldTask.description || '(empty)',
      new_value: payload.description || '(empty)',
      description: 'Updated description',
    });
  }

  if (updates.status_id !== undefined && updates.status_id !== oldTask.status_id) {
    payload.status_id = updates.status_id;
    activities.push({
      field: 'status',
      old_value: oldTask.status_id,
      new_value: updates.status_id,
      description: 'Moved status',
    });
  }

  if (updates.priority !== undefined && updates.priority !== oldTask.priority) {
    payload.priority = updates.priority;
    activities.push({
      field: 'priority',
      old_value: oldTask.priority,
      new_value: updates.priority,
      description: `Changed priority from ${oldTask.priority} to ${updates.priority}`,
    });
  }

  if (updates.assignee !== undefined && updates.assignee !== oldTask.assignee) {
    payload.assignee = updates.assignee ? updates.assignee.trim() : null;
    activities.push({
      field: 'assignee',
      old_value: oldTask.assignee || 'Unassigned',
      new_value: payload.assignee || 'Unassigned',
      description: `Changed assignee to ${payload.assignee || 'Unassigned'}`,
    });
  }

  if (updates.due_date !== undefined && updates.due_date !== oldTask.due_date) {
    payload.due_date = updates.due_date || null;
    activities.push({
      field: 'due_date',
      old_value: oldTask.due_date || 'None',
      new_value: payload.due_date || 'None',
      description: `Changed due date to ${payload.due_date || 'None'}`,
    });
  }

  return { payload, activities };
}

/**
 * Normalize a raw tag-name list: trim, lowercase, drop empties, dedupe.
 * Mirrors the tag normalization performed inside the atomic RPC functions.
 */
function normalizeTagNames(tagNames) {
  if (!tagNames || tagNames.length === 0) return [];
  return Array.from(
    new Set(
      tagNames
        .filter((t) => typeof t === 'string') // null/undefined never become the string "null"
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

module.exports = { computeTaskDiff, normalizeTagNames };
