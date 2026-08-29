/**
 * Pure server-side validation helpers shared by the Server Actions
 * (app/actions/*.ts) and the test suite. Independent of any UI-layer checks.
 * The atomic RPC functions enforce the same rules at the DB level
 * (defense in depth): see supabase/migrations/20260829120000_atomic_rpc.sql.
 */

const ALLOWED_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

/**
 * Strict YYYY-MM-DD calendar-date check. Rejects '2026-13-45', '08/30/2026',
 * 'invalid-date', empty strings, and non-string values.
 */
function isValidDateString(value) {
  if (typeof value !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + 'T00:00:00.000Z');
  if (isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) === value;
}

/**
 * Validates task input fields. Returns an error STRING on failure, or null
 * when the input is valid. Callers convert the string into { error } results.
 */
function validateTaskInput(input) {
  if (input === null || typeof input !== 'object') {
    return 'Invalid task payload';
  }

  // Title: required, must be non-empty after trimming.
  if (input.title !== undefined) {
    if (typeof input.title !== 'string' || input.title.trim().length === 0) {
      return 'Task title is required and cannot be empty';
    }
  }

  // Priority: fixed enum set.
  if (input.priority !== undefined && input.priority !== null) {
    if (typeof input.priority !== 'string' || !ALLOWED_PRIORITIES.includes(input.priority)) {
      return `Invalid priority. Must be one of: ${ALLOWED_PRIORITIES.join(', ')}`;
    }
  }

  // Due date: strict YYYY-MM-DD when provided and non-null.
  if (input.due_date !== undefined && input.due_date !== null && input.due_date !== '') {
    if (!isValidDateString(input.due_date)) {
      return 'Invalid due_date: expected a valid YYYY-MM-DD date';
    }
  }

  return null;
}

/**
 * FK / cross-project check for status_id: the status must exist in the
 * project's own status list. `statuses` is the project's status rows
 * (as fetched server-side); null/undefined statusId fails.
 */
function validateStatusBelongsToProject(statusId, statuses) {
  if (!statusId || typeof statusId !== 'string') return false;
  if (!Array.isArray(statuses)) return false;
  return statuses.some((s) => s && s.id === statusId);
}

/** Required non-empty trimmed text. */
function validateRequiredText(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return `${label} is required and cannot be empty`;
  }
  return null;
}

module.exports = {
  ALLOWED_PRIORITIES,
  isValidDateString,
  validateTaskInput,
  validateStatusBelongsToProject,
  validateRequiredText,
};
