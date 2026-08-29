const test = require('node:test');
const assert = require('node:assert');
const { computeIsOverdue } = require('../lib/overdue.js');

test('Server-Side Overdue Computation', async (t) => {
  const statuses = [
    { id: 'status-1', project_id: 'p1', name: 'Backlog', order_index: 0, color: '#64748b' },
    { id: 'status-2', project_id: 'p1', name: 'In Progress', order_index: 1, color: '#f59e0b' },
    { id: 'status-3', project_id: 'p1', name: 'Review', order_index: 2, color: '#8b5cf6' },
    { id: 'status-4', project_id: 'p1', name: 'Done', order_index: 3, color: '#10b981' },
  ];

  await t.test('returns false when no due date is specified', () => {
    assert.strictEqual(computeIsOverdue(null, 'status-1', statuses), false);
    assert.strictEqual(computeIsOverdue(undefined, 'status-1', statuses), false);
  });

  await t.test('returns false for past dates if status is the final Done column', () => {
    const pastDate = '2020-01-01';
    assert.strictEqual(computeIsOverdue(pastDate, 'status-4', statuses), false);
  });

  await t.test('returns false for past dates if status is named Done (case insensitive)', () => {
    const pastDate = '2020-01-01';
    const customStatuses = [
      { id: 'custom-done', project_id: 'p1', name: 'dOnE', order_index: 0, color: '#10b981' },
      { id: 'custom-other', project_id: 'p1', name: 'Other', order_index: 1, color: '#64748b' },
    ];
    assert.strictEqual(computeIsOverdue(pastDate, 'custom-done', customStatuses), false);
  });

  await t.test('returns true for past dates when task is not in Done status', () => {
    const pastDate = '2020-01-01';
    assert.strictEqual(computeIsOverdue(pastDate, 'status-1', statuses), true);
    assert.strictEqual(computeIsOverdue(pastDate, 'status-2', statuses), true);
  });

  await t.test('returns false for future dates', () => {
    const futureDate = '2099-12-31';
    assert.strictEqual(computeIsOverdue(futureDate, 'status-1', statuses), false);
    assert.strictEqual(computeIsOverdue(futureDate, 'status-2', statuses), false);
  });
});
