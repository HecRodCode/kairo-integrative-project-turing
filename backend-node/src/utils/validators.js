/**
 * Riwi Learning Platform - Validation Utilities
 */

export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password) {
  return password && password.length >= 6;
}

/**
 * Validates that the role matches our DB ENUM
 */
export function validateRole(role) {
  const allowedRoles = ['coder', 'tl'];
  return allowedRoles.includes(role?.toLowerCase().trim());
}

/**
 * Basic name validation (not empty and reasonable length)
 */
export function validateFullName(name) {
  return typeof name === 'string' && name.trim().length >= 3;
}

export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input.trim();
}
