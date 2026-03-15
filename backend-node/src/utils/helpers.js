/**
 * Riwi Learning Platform - General Helper Functions
 * Pure utility functions for data transformation and formatting.
 */

/**
 * Formats a date to a readable string (e.g., "Feb 25, 2026")
 */
export const formatDate = (date) => {
  if (!date) return null;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(date));
};

/**
 * Calculates a percentage from two values safely.
 */
export const calculatePercentage = (part, total) => {
  if (!total || total === 0) return 0;
  return Math.round((part / total) * 100);
};
