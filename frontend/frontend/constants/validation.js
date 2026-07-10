// constants/validation.js
// -----------------------------------------------------------------------------
// Shared form-validation helpers for the auth screens.
//
// Password policy (typical security baseline):
//   - at least 8 characters
//   - at least one uppercase letter
//   - at least one lowercase letter
//   - at least one number
//   - at least one special character
//
// getPasswordChecks() returns a per-rule pass/fail map so the UI can show a live
// checklist + strength meter. validatePassword() returns a single error string
// (or null) for simple submit-time validation.
// -----------------------------------------------------------------------------

// Pragmatic email format check.
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email) {
  return EMAIL_REGEX.test(email);
}

// The individual password rules, in display order.
export const PASSWORD_RULES = [
  { key: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { key: 'number', label: 'One number', test: (p) => /[0-9]/.test(p) },
  {
    key: 'special',
    label: 'One special character (e.g., !@#$%^&*)',
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

// Returns e.g. { length: true, upper: false, ... } plus a passed count.
export function getPasswordChecks(password = '') {
  const checks = {};
  let passed = 0;
  for (const rule of PASSWORD_RULES) {
    const ok = rule.test(password);
    checks[rule.key] = ok;
    if (ok) passed += 1;
  }
  return { checks, passed, total: PASSWORD_RULES.length };
}

// 0..4 strength score derived from how many rules pass (length is required and
// not double-counted as "strength"). Used to color the strength bar.
export function getPasswordStrength(password = '') {
  if (!password) return { score: 0, label: '', satisfiesAll: false };
  const { passed, total } = getPasswordChecks(password);
  const satisfiesAll = passed === total;
  // Map passed-count (0..5) to a 0..4 score.
  const score = Math.min(4, Math.max(0, passed - 1));
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score, label: labels[score], satisfiesAll };
}

// Single-string validator for submit-time checks. Returns an error message or null.
export function validatePassword(password = '') {
  if (!password) return 'Password is required.';
  const { checks } = getPasswordChecks(password);
  if (!checks.length) return 'Password must be at least 8 characters.';
  if (!checks.upper || !checks.lower) return 'Use both uppercase and lowercase letters.';
  if (!checks.number) return 'Include at least one number.';
  if (!checks.special) return 'Your password must include at least one special character (e.g., !@#$%^&*).';
  return null;
}
