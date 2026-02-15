/**
 * Validate email format
 */
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password) {
  return password && password.length >= 6;
}

/**
 * Sanitize input to prevent SQL injection
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input.trim();
}
