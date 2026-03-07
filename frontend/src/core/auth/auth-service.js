/* Communication service with the API */
const API_BASE = 'http://127.0.0.1:3000/api/auth';

export const authService = {
  // Sends user credentials to the server for authentication and token generation
  async login(credentials) {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return response;
  },

  // Processes new account creation by sending structured user data to the API
  async register(userData) {
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return response;
  },

  // Validates existing social media sessions using secure cross-origin credentials
  async checkSocial() {
    return fetch(`${API_BASE}/me`, { credentials: 'include' });
  },
};
