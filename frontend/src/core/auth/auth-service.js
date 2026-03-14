/**
 * src/core/auth/auth-service.js
 */

import { cachedFetch } from '../utils/fetchCache.js';

const API_BASE =
  'https://kairo-integrative-project-turing-production.up.railway.app/api';

const AUTH_CHECK_CACHE_TTL = 5_000; // ms
let _cachedCheckAuth = null;
let _cachedCheckAuthExpires = 0;

function invalidateAuthCheckCache() {
  _cachedCheckAuth = null;
  _cachedCheckAuthExpires = 0;
}

export const authService = {
  async login(credentials) {
    invalidateAuthCheckCache();
    return fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
  },

  async register(userData) {
    return fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
  },

  async logout() {
    invalidateAuthCheckCache();
    return fetch(`${API_BASE}/auth/logout`, {
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
    _cachedCheckAuth = fetch(`${API_BASE}/auth/check`, {
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
    // Caching this avoids repeated calls during onboarding and role checks.
    return cachedFetch(`${API_BASE}/auth/me`, { credentials: 'include' });
  },

  async completeOnboarding(payload) {
    return fetch(`${API_BASE}/auth/complete-onboarding`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async saveDiagnostic(payload) {
    return fetch(`${API_BASE}/diagnostics`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  invalidateAuthCheckCache,
};
