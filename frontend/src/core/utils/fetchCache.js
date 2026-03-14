/**
 * Lightweight in-memory cache for GET requests.
 *
 * Useful to avoid multiple identical fetches in a short span of time
 * (e.g. /api/auth/check called by multiple guards, or /api/profile on concurrent renders).
 *
 * Note: This cache exists only per browser session (page load). It is NOT persisted.
 */

const DEFAULT_TTL = 5_000; // ms
const _cache = new Map(); // key -> { expires, promise }

export function cachedFetch(url, options = {}, ttlMs = DEFAULT_TTL) {
  const method = (options.method || 'GET').toUpperCase();

  // Only cache GET requests; other methods should bypass.
  if (method !== 'GET') return fetch(url, options);

  const key = `${method}:${url}`;
  const now = Date.now();

  const entry = _cache.get(key);
  if (entry && entry.expires > now) {
    return entry.promise;
  }

  const promise = fetch(url, options).finally(() => {
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
