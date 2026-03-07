/* Communication service with the API */
const API_BASE = 'http://127.0.0.1:3000/api/auth';

export const authService = {
  async login(credentials) {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return response;
  },

  async register(userData) {
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return response;
  },

  async checkSocial() {
    return fetch(`${API_BASE}/me`, { credentials: 'include' });
  },
};
