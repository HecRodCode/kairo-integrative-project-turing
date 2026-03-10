/**
 * src/core/auth/session.js
 * Session management and Role-Based routing.
 * localStorage stores a cached copy of the user for UI purposes only.
 * The real source of truth is always the server session cookie.
 */

import { authService } from './auth-service.js';

/* ── Relative base path from any view inside src/views/** ── */
const PATHS = {
  login: '/frontend/src/views/auth/login.html',
  onboarding: '/frontend/src/views/coder/onboarding.html',
  coderDashboard: '/frontend/src/views/coder/dashboard.html',
  tlDashboard: '/frontend/src/views/tl/dashboard.html',
};

export const sessionManager = {
  /* ── Persistence (UI cache only) ── */

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

  /* ── Logout ── */
  async logout() {
    try {
      await authService.logout(); // invalidate server session
    } catch (err) {
      console.error('[Session] Logout request failed:', err);
    }
    this.clearUser();
    window.location.href = PATHS.login;
  },

  /* ── Role-based redirect ── */

  redirectByRole(user) {
    if (!user?.role) return;
    const role = user.role.toLowerCase().trim();

    if (role === 'tl' || role === 'admin') {
      window.location.href = PATHS.tlDashboard;
    } else {
      // Coder: go to onboarding if first login, dashboard otherwise
      window.location.href = user.firstLogin
        ? PATHS.onboarding
        : PATHS.coderDashboard;
    }
  },
};

/* ════════════════════════════════════════
   ROUTE GUARDS
   Import session-guard.js in each protected page (not on login/register).
════════════════════════════════════════ */

export const guards = {
  /**
   * requireAuth()
   * Verifies the session with the server.
   * If not authenticated → redirects to login.
   * Returns the user object if authenticated.
   */
  async requireAuth() {
    try {
      const res = await authService.checkAuth();
      const data = await res.json();

      if (!res.ok || !data.authenticated) {
        sessionManager.clearUser();
        window.location.href = PATHS.login;
        return null;
      }

      return data;
    } catch {
      window.location.href = PATHS.login;
      return null;
    }
  },

  /**
   * requireOnboarding()
   * Used on the onboarding page.
   * - Not authenticated       → login
   * - Already did onboarding  → dashboard
   */
  async requireOnboarding() {
    const session = await this.requireAuth();
    if (!session) return null;

    if (!session.firstLogin) {
      // Already completed onboarding
      window.location.href = PATHS.coderDashboard;
      return null;
    }

    return session;
  },

  /**
   * requireCompleted()
   * Used on dashboard and other post-onboarding pages.
   * - Not authenticated      → login
   * - firstLogin still true  → onboarding
   */
  async requireCompleted() {
    const session = await this.requireAuth();
    if (!session) return null;

    if (session.firstLogin) {
      window.location.href = PATHS.onboarding;
      return null;
    }

    return session;
  },

  /**
   * requireGuest()
   * Used on login and register pages.
   * If already authenticated → redirect by role.
   */
  async requireGuest() {
    try {
      const res = await authService.checkAuth();
      const data = await res.json();

      if (res.ok && data.authenticated) {
        // Already logged in — get full user and redirect
        const meRes = await authService.getMe();
        const meData = await meRes.json();
        if (meData.user) {
          sessionManager.saveUser(meData.user);
          sessionManager.redirectByRole(meData.user);
        }
      }
    } catch {
      // Not logged in — stay on login/register page, that's fine
    }
  },
};
