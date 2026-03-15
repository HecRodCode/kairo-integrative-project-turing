/**
 * Lightweight in-memory cache for GET requests.
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
