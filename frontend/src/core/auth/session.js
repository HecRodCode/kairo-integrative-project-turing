/**
 * src/core/auth/session.js
 * Session management and Role-Based routing — Kairo Project.
 *
 * Source of truth: server session cookie (checkAuth endpoint).
 * localStorage: UI cache only — never used for security decisions.
 *
 * first_login flow:
 *   true  → user just registered, must complete onboarding test
 *   false → onboarding done, goes straight to dashboard
 *   Flipped to false by Node when coder completes the diagnostic.
 */

import { authService } from './auth-service.js';

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

  /**
   * redirectByRole(user)
   * Receives the user object directly (camelCase from backend).
   * Routing logic:
   *   - tl / admin  → TL dashboard (firstLogin doesn't apply)
   *   - coder       → onboarding if firstLogin === true, else dashboard
   */
  redirectByRole(user) {
    if (!user?.role) return;
    const role = user.role.toLowerCase().trim();

    if (role === 'tl' || role === 'admin') {
      window.location.href = PATHS.tlDashboard;
      return;
    }

    // Coder: first_login drives the split
    window.location.href = user.firstLogin
      ? PATHS.onboarding
      : PATHS.coderDashboard;
  },
};

/* ══════════════════════════════════════════════════════════════
   GUARDS
   checkAuth() returns: { authenticated, user: { id, email,
     fullName, role, clan, firstLogin } }
   So always access firstLogin via session.user.firstLogin.
══════════════════════════════════════════════════════════════ */
export const guards = {
  /**
   * requireAuth()
   * Verifies the cookie session with the server.
   * Returns { authenticated, user } or redirects to login.
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

      // Keep localStorage cache in sync
      sessionManager.saveUser(data.user);
      return data; // shape: { authenticated: true, user: { ...firstLogin... } }
    } catch {
      sessionManager.clearUser();
      window.location.href = PATHS.login;
      return null;
    }
  },

  /**
   * requireOnboarding()
   * For the onboarding page only.
   * ✓ Authenticated + firstLogin === true  → allow
   * ✗ Not authenticated                    → login
   * ✗ firstLogin === false                 → dashboard (already done)
   */
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

  /**
   * requireCompleted()
   * For dashboard and all post-onboarding pages.
   * ✓ Authenticated + firstLogin === false → allow
   * ✗ Not authenticated                    → login
   * ✗ firstLogin === true                  → onboarding (must complete test)
   */
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

  /**
   * requireGuest()
   * For login and register pages.
   * If already authenticated → redirect by role (respects firstLogin).
   */
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
