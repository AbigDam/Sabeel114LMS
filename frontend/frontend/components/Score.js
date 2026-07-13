// respect and behavior are raw component scores from the backend.
// attendance is 0 (present) or 1 (absent).
export function computeScore({ respect = 0, behavior = 0, attendance = 1 }) {
  const respectScore = Number(respect) || 0;
  const behaviorScore = Number(behavior) || 0;
  const attendanceScore = attendance === 0 ? 1 : 0;
  return respectScore + behaviorScore + attendanceScore;
}

export function isPresent(attendance) {
  return attendance === 0;
}

// Score ranges from 0 (lowest) to 6 (highest). Parents see a category
// label instead of the raw number.
export function scoreToCategory(score) {
  if (score >= 5) {
    return { label: 'Excellent', color: '#15803D', bg: '#DCFCE7' };
  }
  if (score >= 3) {
    return { label: 'Good', color: '#92400E', bg: '#FEF3C7' };
  }
  return { label: 'Needs Improvement', color: '#B91C1C', bg: '#FEE2E2' };
}