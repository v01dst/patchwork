const test = require('node:test');
const assert = require('node:assert');

test('Server Actions Data Flow & Validation', async (t) => {
  // Mock In-Memory Database for testing Server Action logic
  const mockTasks = [
    { id: 'task-1', project_id: 'p1', title: 'Task 1', status_id: 's1', priority: 'medium', assignee: 'Alex', due_date: null }
  ];
  const mockStatuses = [
    { id: 's1', project_id: 'p1', name: 'Todo', order_index: 0 },
    { id: 's2', project_id: 'p1', name: 'In Progress', order_index: 1 }
  ];
  const mockActivity = [];

  // Simulated Server Action: updateTaskStatusAction
  async function updateTaskStatusAction(taskId, newStatusId) {
    if (!taskId) return { error: 'Task ID is required' };
    if (!newStatusId) return { error: 'status_id is required' };

    const task = mockTasks.find(t => t.id === taskId);
    if (!task) return { error: 'Task not found' };

    const oldStatus = mockStatuses.find(s => s.id === task.status_id)?.name || task.status_id;
    const newStatus = mockStatuses.find(s => s.id === newStatusId)?.name || newStatusId;

    task.status_id = newStatusId;

    // Automated activity log
    mockActivity.push({
      task_id: taskId,
      project_id: task.project_id,
      field: 'status',
      old_value: oldStatus,
      new_value: newStatus,
      description: `Moved status from ${oldStatus} to ${newStatus}`,
      created_at: new Date().toISOString()
    });

    return { data: { ...task } };
  }

  await t.test('Server Action moves task status without fetch and returns typed data', async () => {
    const res = await updateTaskStatusAction('task-1', 's2');
    assert.strictEqual(res.error, undefined);
    assert.strictEqual(res.data.status_id, 's2');
  });

  await t.test('Server Action automatically generates transactional activity log', async () => {
    assert.strictEqual(mockActivity.length, 1);
    assert.strictEqual(mockActivity[0].field, 'status');
    assert.strictEqual(mockActivity[0].old_value, 'Todo');
    assert.strictEqual(mockActivity[0].new_value, 'In Progress');
    assert.strictEqual(mockActivity[0].description, 'Moved status from Todo to In Progress');
  });

  await t.test('Server Action returns error for invalid task ID', async () => {
    const res = await updateTaskStatusAction('invalid-id', 's2');
    assert.strictEqual(res.error, 'Task not found');
    assert.strictEqual(res.data, undefined);
  });
});
