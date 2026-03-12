/**
 * src/core/auth/session.js
 * Session management and Role-Based routing — Kairo Project.
 */

import { authService } from './auth-service.js';
import { notificationsClient } from '../notificationsSSE.js';

/* ── Absolute paths from web root ──────────────────────────── */
const PATHS = {
  login: '/frontend/src/views/auth/login.html',
  onboarding: '/frontend/src/views/coder/onboarding.html',
  coderDashboard: '/frontend/src/views/coder/dashboard.html',
  tlDashboard: '/frontend/src/views/tl/dashboard.html',
};

/* ══════════════════════════════════════════════════════════════
   SESSION MANAGER
══════════════════════════════════════════════════════════════ */
export const sessionManager = {
  saveUser(user) {
    localStorage.setItem('kairo_user', JSON.stringify(user));
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('kairo_user'));
    } catch {
      return null;
    }
  },

  clearUser() {
    localStorage.removeItem('kairo_user');
  },

  async logout() {
    try {
      await authService.logout();
    } catch (err) {
      console.error('[Session] Logout failed:', err);
    }
    this.clearUser();
    window.location.href = PATHS.login;
  },

  redirectByRole(user) {
    if (!user?.role) return;
    const role = user.role.toLowerCase().trim();

    if (role === 'tl' || role === 'admin') {
      window.location.href = PATHS.tlDashboard;
      return;
    }

    // Coder: first_login drives the split
    window.location.href = user.firstLogin ? PATHS.onboarding : PATHS.coderDashboard;
  },
};

export const guards = {
  async requireAuth() {
    try {
      const res = await authService.checkAuth();
      const data = await res.json();

      if (!res.ok || !data.authenticated) {
        sessionManager.clearUser();
        window.location.href = PATHS.login;
        return null;
      }

      // Keep localStorage cache in sync
      sessionManager.saveUser(data.user);

      // GLOBALLY auto-connect the SSE Notification service for all validated users on any page
      if (data.user.role) {
        notificationsClient.connect(data.user.role);
      }

      return data; // shape: { authenticated: true, user: { ...firstLogin... } }
    } catch {
      sessionManager.clearUser();
      window.location.href = PATHS.login;
      return null;
    }
  },

  async requireOnboarding() {
    const session = await this.requireAuth();
    if (!session) return null;

    // BUG WAS HERE: session.firstLogin (undefined) → session.user.firstLogin
    if (!session.user.firstLogin) {
      window.location.href = PATHS.coderDashboard;
      return null;
    }

    return session;
  },

  async requireCompleted() {
    const session = await this.requireAuth();
    if (!session) return null;

    // BUG WAS HERE: session.firstLogin (undefined) → session.user.firstLogin
    if (session.user.firstLogin) {
      window.location.href = PATHS.onboarding;
      return null;
    }

    return session;
  },

  async requireGuest() {
    try {
      const res = await authService.checkAuth();
      const data = await res.json();

      if (res.ok && data.authenticated && data.user) {
        sessionManager.saveUser(data.user);
        sessionManager.redirectByRole(data.user);
      }
      // Not authenticated → stay on login/register, no action needed
    } catch {
      // Network error or not logged in — stay on page
    }
  },
};
