/**
 * src/core/auth/auth-service.js
 *
 * FIX: API_BASE changed from 127.0.0.1 to localhost.
 *      The OAuth buttons in HTML point to localhost:3000.
 *      The session cookie is set on localhost.
 *      ALL fetch calls must also go to localhost — mixing hostnames
 *      breaks cookies because the browser treats them as different domains.
 */

const API_BASE = 'http://localhost:3000/api';

export const authService = {
  async login(credentials) {
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
    return fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  },

  async checkAuth() {
    return fetch(`${API_BASE}/auth/check`, {
      credentials: 'include',
    });
  },

  async getMe() {
    return fetch(`${API_BASE}/auth/me`, {
      credentials: 'include',
    });
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
};
