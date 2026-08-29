import { describe, it, expect } from 'vitest';

describe('Activity Diff Calculation Logic', () => {
  function computeTaskDiffs(oldTask: any, updates: any, statusMap: Record<string, string>) {
    const activities: any[] = [];

    if (updates.title !== undefined && updates.title.trim() !== oldTask.title) {
      activities.push({
        field: 'title',
        old_value: oldTask.title,
        new_value: updates.title.trim(),
        description: `Changed title from "${oldTask.title}" to "${updates.title.trim()}"`,
      });
    }

    if (updates.status_id !== undefined && updates.status_id !== oldTask.status_id) {
      const oldStatus = statusMap[oldTask.status_id] || oldTask.status_id;
      const newStatus = statusMap[updates.status_id] || updates.status_id;
      activities.push({
        field: 'status',
        old_value: oldStatus,
        new_value: newStatus,
        description: `Moved status from ${oldStatus} to ${newStatus}`,
      });
    }

    if (updates.priority !== undefined && updates.priority !== oldTask.priority) {
      activities.push({
        field: 'priority',
        old_value: oldTask.priority,
        new_value: updates.priority,
        description: `Changed priority from ${oldTask.priority} to ${updates.priority}`,
      });
    }

    if (updates.assignee !== undefined && updates.assignee !== oldTask.assignee) {
      activities.push({
        field: 'assignee',
        old_value: oldTask.assignee || 'Unassigned',
        new_value: updates.assignee || 'Unassigned',
        description: `Changed assignee to ${updates.assignee || 'Unassigned'}`,
      });
    }

    return activities;
  }

  it('records audit log on status movement', () => {
    const oldTask = { title: 'Implement Auth', status_id: 's1', priority: 'medium', assignee: 'Alex' };
    const updates = { status_id: 's2' };
    const statusMap = { s1: 'Todo', s2: 'In Progress' };

    const diffs = computeTaskDiffs(oldTask, updates, statusMap);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].field).toBe('status');
    expect(diffs[0].old_value).toBe('Todo');
    expect(diffs[0].new_value).toBe('In Progress');
    expect(diffs[0].description).toBe('Moved status from Todo to In Progress');
  });

  it('records multiple field changes accurately', () => {
    const oldTask = { title: 'Old Title', status_id: 's1', priority: 'low', assignee: null };
    const updates = { title: 'New Title', priority: 'urgent', assignee: 'Sarah' };
    const statusMap = { s1: 'Todo' };

    const diffs = computeTaskDiffs(oldTask, updates, statusMap);
    expect(diffs).toHaveLength(3);
    expect(diffs.find(d => d.field === 'title')?.new_value).toBe('New Title');
    expect(diffs.find(d => d.field === 'priority')?.new_value).toBe('urgent');
    expect(diffs.find(d => d.field === 'assignee')?.new_value).toBe('Sarah');
  });

  it('does not log when values remain unchanged', () => {
    const oldTask = { title: 'Same Title', status_id: 's1', priority: 'medium' };
    const updates = { title: 'Same Title', priority: 'medium' };
    const diffs = computeTaskDiffs(oldTask, updates, {});
    expect(diffs).toHaveLength(0);
  });
});
