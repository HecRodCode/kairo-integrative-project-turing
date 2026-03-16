/**
 * src/core/auth/session.js
 * Session manager + route guards — Kairo Project
 */

import { authService } from './auth-service.js';
import { notificationsClient } from '../notificationsSSE.js';

/* ── Path resolver robusto ───────────────────────────────── */
const getRootPath = () => {
  if (window.__KAIRO_VIEWS_BASE__) return window.__KAIRO_VIEWS_BASE__;

  const { pathname, hostname } = window.location;

  if (pathname.includes('/kairo-integrative-project-turing/')) {
    return '/kairo-integrative-project-turing/frontend/src/views';
  }

  if (pathname.includes('/frontend/')) {
    const match = pathname.match(/^(.*\/frontend)/);
    return match ? `${match[1]}/src/views` : '/frontend/src/views';
  }

  return '/src/views';
};

const BASE = getRootPath();

export const PATHS = {
  login: `${BASE}/auth/login.html`,
  onboarding: `${BASE}/coder/onboarding.html`,
  coderDashboard: `${BASE}/coder/dashboard.html`,
  tlDashboard: `${BASE}/tl/dashboard.html`,
};

/* ── Session Manager ─────────────────────────────────────── */
export const sessionManager = {
  saveUser(user) {
    if (!user) return;
    const normalized = {
      id: user.id,
      fullName: user.fullName || user.full_name || '',
      role: user.role || 'coder',
      clanId: user.clanId || user.clan || null,
      firstLogin:
        user.firstLogin !== undefined
          ? user.firstLogin
          : user.first_login !== undefined
            ? user.first_login
            : true,
    };
    localStorage.setItem('kairo_user', JSON.stringify(normalized));
  },

  getUser() {
    try {
      const raw = localStorage.getItem('kairo_user');
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn('[Session] getUser parse error:', err.message);
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
      console.warn('[Session] Server logout failed:', err.message);
    }
    this.clearUser();
    window.location.replace(PATHS.login);
  },

  redirectByRole(user) {
    if (!user) {
      window.location.href = PATHS.login;
      return;
    }
    const role = user.role?.toLowerCase().trim();
    const isFirstLogin = user.firstLogin === true || user.first_login === true;

    if (role === 'tl' || role === 'admin') {
      window.location.href = PATHS.tlDashboard;
    } else {
      window.location.href = isFirstLogin
        ? PATHS.onboarding
        : PATHS.coderDashboard;
    }
  },
};

/* ── Guards ──────────────────────────────────────────────── */
export const guards = {
  async requireAuth() {
    const cached = sessionManager.getUser();
    if (!cached) {
      window.location.replace(PATHS.login);
      return null;
    }
    try {
      const res = await authService.checkAuth();
      const data = await res.json();
      if (!res.ok || !data.authenticated) {
        sessionManager.clearUser();
        window.location.replace(PATHS.login);
        return null;
      }
      sessionManager.saveUser(data.user);
      if (data.user?.role) notificationsClient.connect(data.user.role);
      return data;
    } catch (err) {
      console.warn(
        '[Guard] requireAuth network error, using cache:',
        err.message
      );
      return { user: cached };
    }
  },

  async requireCompleted() {
    const cached = sessionManager.getUser();
    if (!cached) {
      window.location.replace(PATHS.login);
      return null;
    }
    try {
      const res = await authService.checkAuth();
      const data = await res.json();

      if (!res.ok || !data.authenticated) {
        sessionManager.clearUser();
        window.location.replace(PATHS.login);
        return null;
      }

      const user = data.user;
      sessionManager.saveUser(user);

      const isFirstLogin =
        user.firstLogin === true || user.first_login === true;
      if (isFirstLogin) {
        window.location.replace(PATHS.onboarding);
        return null;
      }

      if (data.user?.role) notificationsClient.connect(data.user.role);
      return data;
    } catch (err) {
      console.warn(
        '[Guard] requireCompleted network error, using cache:',
        err.message
      );
      if (cached && cached.firstLogin === false) {
        return { user: cached };
      }
      window.location.replace(PATHS.login);
      return null;
    }
  },

async requireGuest() {
  try {
    const res = await authService.checkAuth();
    const data = await res.json();

    if (res.ok && data.authenticated) {
      sessionManager.saveUser(data.user);       // guarda el usuario OAuth
      sessionManager.redirectByRole(data.user); // redirige correctamente
    } else {
      sessionManager.clearUser();
    }
  } catch (err) {
    console.warn('[Guard] requireGuest network error:', err.message);
    // Solo en error de red usamos caché como fallback
    const cached = sessionManager.getUser();
    if (cached) sessionManager.redirectByRole(cached);
  }
},

  async requireOnboarding() {
    const cached = sessionManager.getUser();
    if (!cached) {
      window.location.replace(PATHS.login);
      return null;
    }
    try {
      const res = await authService.checkAuth();
      const data = await res.json();

      if (!res.ok || !data.authenticated) {
        sessionManager.clearUser();
        window.location.replace(PATHS.login);
        return null;
      }

      const user = data.user;
      sessionManager.saveUser(user);
      const role = user.role?.toLowerCase().trim();

      if (role === 'tl' || role === 'admin') {
        window.location.replace(PATHS.tlDashboard);
        return null;
      }

      const isFirstLogin =
        user.firstLogin === true || user.first_login === true;
      if (!isFirstLogin) {
        window.location.replace(PATHS.coderDashboard);
        return null;
      }

      return data;
    } catch (err) {
      console.warn('[Guard] requireOnboarding network error:', err.message);
      const isFirstLogin = cached.firstLogin === true;
      if (cached && isFirstLogin) return { user: cached };
      window.location.replace(PATHS.login);
      return null;
    }
  },
};
