function computeIsOverdue(dueDateStr, statusId, allStatuses) {
  if (!dueDateStr) return false;

  const sortedStatuses = [...allStatuses].sort((a, b) => a.order_index - b.order_index);
  const lastStatus = sortedStatuses[sortedStatuses.length - 1];

  if (lastStatus && statusId === lastStatus.id) {
    return false;
  }
  
  const currentStatus = allStatuses.find(s => s.id === statusId);
  if (currentStatus && currentStatus.name.toLowerCase() === 'done') {
    return false;
  }

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  return dueDateStr < todayStr;
}

module.exports = { computeIsOverdue };
