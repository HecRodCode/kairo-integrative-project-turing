/**
 * Lightweight in-memory cache for GET requests.
 *
 * Useful to avoid multiple identical fetches in a short span of time
 * (e.g. /api/auth/check called by multiple guards, or /api/profile on concurrent renders).
 *
 * Note: This cache exists only per browser session (page load). It is NOT persisted.
 */

const DEFAULT_TTL = 10_000; // ms
const _cache = new Map(); // key -> { expires, promise }

export const CACHE_TTL = {
  AUTH_CHECK: 10_000,
  USER_PROFILE: 30_000,
  DASHBOARD: 5_000,
  STATIC: 60_000,
};

function fetchWithTimeout(url, options = {}, timeoutMs = 10_000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, { ...options, signal: controller.signal }).finally(() => {
    clearTimeout(id);
  });
}

export function cachedFetch(
  url,
  options = {},
  ttlMs = DEFAULT_TTL,
  timeoutMs = 10_000
) {
  const method = (options.method || 'GET').toUpperCase();

  // Only cache GET requests; other methods should bypass.
  if (method !== 'GET') return fetchWithTimeout(url, options, timeoutMs);

  const key = `${method}:${url}`;
  const now = Date.now();

  const entry = _cache.get(key);
  if (entry && entry.expires > now) {
    return entry.promise;
  }

  const promise = fetchWithTimeout(url, options, timeoutMs).finally(() => {
    // Keep the cache entry until TTL expires.
  });

  _cache.set(key, { expires: now + ttlMs, promise });
  return promise;
}

export function invalidateFetchCache(url, method = 'GET') {
  _cache.delete(`${method.toUpperCase()}:${url}`);
}

export function clearFetchCache() {
  _cache.clear();
}
