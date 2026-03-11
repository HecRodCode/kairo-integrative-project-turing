/**
 * utils/validators.js
 * Server-side validation utilities.
 *
 * FIX: validateRole now includes 'admin' to match the role_enum in the DB.
 *      Without it, any admin registration attempt failed validation silently.
 */

export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password) {
  return typeof password === 'string' && password.length >= 6;
}

/**
 * Must match role_enum: 'coder' | 'tl' | 'admin'
 * FIX: 'admin' was missing.
 */
export function validateRole(role) {
  const allowedRoles = ['coder', 'tl', 'admin'];
  return allowedRoles.includes(role?.toLowerCase().trim());
}

export function validateFullName(name) {
  return typeof name === 'string' && name.trim().length >= 3;
}

export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input.trim();
}
