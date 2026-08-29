import { Status } from '@/types';

/**
 * Checks if a task is overdue.
 * Rule: A task is overdue if:
 *  1. due_date is present
 *  2. due_date < current date (YYYY-MM-DD comparison in UTC/local date)
 *  3. status is not the final / highest order_index status (Done)
 */
export function computeIsOverdue(
  dueDateStr: string | null | undefined,
  statusId: string,
  allStatuses: Status[]
): boolean {
  if (!dueDateStr) return false;

  // Find done status (highest order_index or named 'Done' / last column)
  const sortedStatuses = [...allStatuses].sort((a, b) => a.order_index - b.order_index);
  const lastStatus = sortedStatuses[sortedStatuses.length - 1];

  // If status is the last status or matches 'done' (case-insensitive), it's not overdue
  if (lastStatus && statusId === lastStatus.id) {
    return false;
  }
  
  const currentStatus = allStatuses.find(s => s.id === statusId);
  if (currentStatus && currentStatus.name.toLowerCase() === 'done') {
    return false;
  }

  // Parse YYYY-MM-DD
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  return dueDateStr < todayStr;
}
