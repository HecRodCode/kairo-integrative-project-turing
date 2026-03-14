/**
 * src/core/config.js
 * Shared runtime configuration for frontend API endpoints.
 */

const DEFAULT_API_BASE =
  'https://kairo-integrative-project-turing-production.up.railway.app/api';

function computeApiBase() {
  if (typeof window === 'undefined') return DEFAULT_API_BASE;

  // Allow manual override for special deployments (e.g. GH Pages + separate API)
  if (window.KAIRO_API_BASE) return window.KAIRO_API_BASE;

  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1';

  // When running the frontend locally, assume backend is on localhost:3000.
  if (isLocal || window.location.protocol === 'file:') {
    return 'http://localhost:3000/api';
  }

  // Otherwise use production backend.
  return DEFAULT_API_BASE;
}

export const API_BASE = computeApiBase();
export const API_ROOT = API_BASE.replace(/\/api\/?$/, '');
