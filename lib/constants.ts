export const DEFAULT_STATUSES = [
  { name: 'Backlog', order_index: 0, color: '#64748b' },
  { name: 'Todo', order_index: 1, color: '#3b82f6' },
  { name: 'In Progress', order_index: 2, color: '#f59e0b' },
  { name: 'Review', order_index: 3, color: '#8b5cf6' },
  { name: 'Done', order_index: 4, color: '#10b981' },
];

export const ALLOWED_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
