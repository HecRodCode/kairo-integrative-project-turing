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

/**
 * Maps DB Snake_Case keys to Frontend camelCase (Optional but recommended)
 * This keeps the JS code clean and consistent.
 */
export const toCamelCase = (obj) => {
  const newObj = {};
  for (let key in obj) {
    const camelKey = key.replace(/([-_][a-z])/gi, ($1) => {
      return $1.toUpperCase().replace('-', '').replace('_', '');
    });
    newObj[camelKey] = obj[key];
  }
  return newObj;
};

/**
 * Truncates long text for dashboard previews.
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
