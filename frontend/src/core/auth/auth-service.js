/**
 * src/core/auth/auth-service.js
 */

import { cachedFetch } from '../utils/fetchCache.js';
import { API_BASE } from '../config.js';

const DEFAULT_FETCH_TIMEOUT = 60_000;
const AUTH_CHECK_CACHE_TTL = 10_000;
let _cachedCheckAuth = null;
let _cachedCheckAuthExpires = 0;

function fetchWithTimeout(url, options = {}, timeout = DEFAULT_FETCH_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const signal = controller.signal;
  const merged = { ...options, signal };
  return fetch(url, merged).finally(() => clearTimeout(id));
}

function invalidateAuthCheckCache() {
  _cachedCheckAuth = null;
  _cachedCheckAuthExpires = 0;
}

export const authService = {
  async login(credentials) {
    invalidateAuthCheckCache();
    return fetchWithTimeout(`${API_BASE}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
  },

  async register(userData) {
    return fetchWithTimeout(`${API_BASE}/auth/register`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
  },

  async logout() {
    invalidateAuthCheckCache();
    return fetchWithTimeout(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  },

  async checkAuth() {
    const now = Date.now();
    if (_cachedCheckAuth && now < _cachedCheckAuthExpires) {
      return _cachedCheckAuth;
    }

    _cachedCheckAuthExpires = now + AUTH_CHECK_CACHE_TTL;
    _cachedCheckAuth = fetchWithTimeout(`${API_BASE}/auth/check`, {
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) invalidateAuthCheckCache();
        return res;
      })
      .catch((err) => {
        invalidateAuthCheckCache();
        throw err;
      });

    return _cachedCheckAuth;
  },

  async getMe() {
    // Caching + timeout avoids hanging requests during connectivity issues.
    return cachedFetch(
      `${API_BASE}/auth/me`,
      { credentials: 'include' },
      30_000,
      10_000
    );
  },

  async completeOnboarding(payload) {
    return fetchWithTimeout(`${API_BASE}/auth/complete-onboarding`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async saveDiagnostic(payload) {
    return fetchWithTimeout(`${API_BASE}/diagnostics`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  invalidateAuthCheckCache,
};
