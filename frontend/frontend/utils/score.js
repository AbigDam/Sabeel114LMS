export function isPresent(attendance) {
  // 0 = Present, anything else = Absent
  return attendance === 0;
}

export function computeScore(log) {
  const respect = log.respect ?? 0;
  const behavior = log.behavior ?? 0;
  const attendance = isPresent(log.attendance) ? 1 : 0;

  return respect + behavior + attendance;
}

export function scoreToCategory(score) {
  if (score >= 6) {
    return {
      label: 'Excellent',
      color: '#166534',
      bg: '#DCFCE7',
    };
  }

  if (score >= 4) {
    return {
      label: 'Good',
      color: '#B45309',
      bg: '#FEF3C7',
    };
  }

  return {
    label: 'Needs Improvement',
    color: '#B91C1C',
    bg: '#FEE2E2',
  };
}