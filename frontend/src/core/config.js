/**
 * src/core/config.js
 */

const PROD_URL =
  'https://kairo-integrative-project-turing-production.up.railway.app';

function computeApiBase() {
  // Guard for non-browser environments (SSR, Node imports, etc.)
  if (typeof window === 'undefined') return `${PROD_URL}/api`;

  // Manual override takes highest priority
  if (window.KAIRO_API_BASE) return window.KAIRO_API_BASE;

  const { hostname, protocol } = window.location;

  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    protocol === 'file:';

  return isLocal
    ? `http://localhost:${window.__KAIRO_DEV_PORT__ || 3000}/api`
    : `${PROD_URL}/api`;
}

export const API_BASE = computeApiBase();
