// utils/score.js
// -----------------------------------------------------------------------------
// Mirrors backend calculate_score():
//   respect, participation, hw_prep, lesson_prog are each shifted from a
//   1-3 raw rating to a 0-2 score (null -> 0).
//   attendance contributes 1 point when attendance === 0 ("present"), else 0.
//   Total range: 0-9.
// -----------------------------------------------------------------------------

const SCORE_MAX = 9;

function shifted(value) {
  return value != null ? value - 1 : 0;
}

export function computeScore(day) {
  const respectScore = shifted(day.respect);
  const participationScore = shifted(day.participation);
  const hwPrepScore = shifted(day.hw_prep);
  const lessonProgScore = shifted(day.lesson_prog);
  const attendanceScore = day.attendance === 0 ? 1 : 0;

  return respectScore + participationScore + hwPrepScore + lessonProgScore + attendanceScore;
}

// attendance === 0 means present; any other value (late/absent codes) is not.
export function isPresent(attendance) {
  return attendance === 0;
}

// 0-9 scale split into three roughly-even bands.
export function scoreToCategory(score) {
  if (score >= 7) {
    return { label: 'Excellent', color: '#065F46', bg: '#D1FAE5' };
  }
  if (score >= 4) {
    return { label: 'Good', color: '#92400E', bg: '#FEF3C7' };
  }
  return { label: 'Needs Improvement', color: '#B91C1C', bg: '#FEE2E2' };
}

export { SCORE_MAX };