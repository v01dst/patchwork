import { describe, it, expect } from 'vitest';
import { computeIsOverdue } from '../lib/overdue';
import { Status } from '../types';

describe('Server-Side Overdue Computation', () => {
  const statuses: Status[] = [
    { id: 'status-1', project_id: 'p1', name: 'Backlog', order_index: 0, color: '#64748b' },
    { id: 'status-2', project_id: 'p1', name: 'In Progress', order_index: 1, color: '#f59e0b' },
    { id: 'status-3', project_id: 'p1', name: 'Review', order_index: 2, color: '#8b5cf6' },
    { id: 'status-4', project_id: 'p1', name: 'Done', order_index: 3, color: '#10b981' },
  ];

  it('returns false when no due date is specified', () => {
    expect(computeIsOverdue(null, 'status-1', statuses)).toBe(false);
    expect(computeIsOverdue(undefined, 'status-1', statuses)).toBe(false);
  });

  it('returns false for past dates if status is the final Done column', () => {
    const pastDate = '2020-01-01';
    expect(computeIsOverdue(pastDate, 'status-4', statuses)).toBe(false);
  });

  it('returns false for past dates if status is named Done (case insensitive)', () => {
    const pastDate = '2020-01-01';
    const customStatuses: Status[] = [
      { id: 'custom-done', project_id: 'p1', name: 'dOnE', order_index: 0, color: '#10b981' },
      { id: 'custom-other', project_id: 'p1', name: 'Other', order_index: 1, color: '#64748b' },
    ];
    expect(computeIsOverdue(pastDate, 'custom-done', customStatuses)).toBe(false);
  });

  it('returns true for past dates when task is not in Done status', () => {
    const pastDate = '2020-01-01';
    expect(computeIsOverdue(pastDate, 'status-1', statuses)).toBe(true);
    expect(computeIsOverdue(pastDate, 'status-2', statuses)).toBe(true);
  });

  it('returns false for future dates', () => {
    const futureDate = '2099-12-31';
    expect(computeIsOverdue(futureDate, 'status-1', statuses)).toBe(false);
    expect(computeIsOverdue(futureDate, 'status-2', statuses)).toBe(false);
  });
});
