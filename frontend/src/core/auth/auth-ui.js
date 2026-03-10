/**
 * src/core/auth/auth-ui.js
 * UI Orchestrator for Authentication — Kairo Project.
 *
 * Depends on:
 *   - auth-service.js  (API calls)
 *   - session.js       (session management + guards)
 *   - validation.js    (validators)
 *   - i18n.js          (must be loaded before this module — exposes window.i18nT)
 */

import { authService } from './auth-service.js';
import { sessionManager, guards } from './session.js';
import { validator } from './validation.js';

/* UI HELPERS */
const ui = {
  getLang: () =>
    localStorage.getItem('kairo-lang') || document.documentElement.lang || 'es',

  /**
   * Shows a toast notification.
   * Uses window.i18nT() (exposed by i18n.js) to translate the key.
   * Falls back to the raw key if i18next is not available.
   */
  showMessage(key, type = 'success', params = {}) {
    let message = typeof window.i18nT === 'function' ? window.i18nT(key) : key;

    // Replace {param} placeholders
    Object.entries(params).forEach(([k, v]) => {
      message = message.replace(`{${k}}`, v);
    });

    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed; top: 20px; right: 20px; padding: 15px 25px;
      border-radius: 12px; font-weight: 600; z-index: 9999;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.4);
      display: flex; align-items: center; gap: 10px;
      transition: all 0.3s ease;
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
      color: white;
      border-left: 5px solid ${type === 'success' ? '#064e3b' : '#7f1d1d'};
      font-family: 'Inter', sans-serif;
    `;
    el.textContent = message;
    document.body.appendChild(el);

    el.animate(
      [
        { transform: 'translateX(100%)', opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 },
      ],
      { duration: 300, easing: 'ease-out' }
    );

    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(20px)';
      setTimeout(() => el.remove(), 300);
    }, 4000);
  },

  /**
   * Toggles button loading state.
   * Uses window.i18nT() for the button label.
   */
  setLoading(btn, isLoading, labelKey) {
    const lang = this.getLang();
    const loadingText = lang === 'es' ? 'Cargando...' : 'Loading...';
    const label =
      typeof window.i18nT === 'function' ? window.i18nT(labelKey) : labelKey;

    btn.disabled = isLoading;
    btn.innerHTML = isLoading
      ? `<span class="spinner"></span> ${loadingText}`
      : label;
  },

  updateStrengthUI(password, barId = 'strength-bar') {
    const bar = document.getElementById(barId);
    if (!bar) return;
    bar.className = 'strength-bar';

    if (!password.length) {
      bar.style.width = '0';
      return;
    }

    const { score } = validator.checkPasswordStrength(password);
    if (score === 1) {
      bar.classList.add('strength-weak');
      bar.style.width = '33%';
    } else if (score === 2) {
      bar.classList.add('strength-medium');
      bar.style.width = '66%';
    } else if (score >= 3) {
      bar.classList.add('strength-strong');
      bar.style.width = '100%';
    }
  },

  setupPasswordToggles() {
    const buttons = document.querySelectorAll('.toggle-password');

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        const eyeOpen = btn.querySelector('.eye-open');
        const eyeClosed = btn.querySelector('.eye-closed');

        if (input && eyeOpen && eyeClosed) {
          const isPassword = input.type === 'password';

          // We changed the input type
          input.type = isPassword ? 'text' : 'password';

          // We alternate the visibility of SVGs
          if (isPassword) {
            eyeOpen.style.display = 'none';
            eyeClosed.style.display = 'block';
          } else {
            eyeOpen.style.display = 'block';
            eyeClosed.style.display = 'none';
          }
        }
      });
    });
  },
};

/* LOGIN HANDLER */
async function handleLogin(e) {
  e.preventDefault();

  const btn = e.target.querySelector('.btn-submit');
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!validator.validateEmail(email)) {
    validator.highlightError('email');
    ui.showMessage('auth.alerts.invalid_email', 'error');
    return;
  }

  ui.setLoading(btn, true, 'auth.btn_login');

  try {
    const res = await authService.login({ email, password });
    const data = await res.json();

    if (res.ok) {
      ui.showMessage('auth.alerts.login_success', 'success', {
        name: data.user.fullName,
      });
      sessionManager.saveUser(data.user);
      setTimeout(() => sessionManager.redirectByRole(data.user), 1500);
    } else {
      validator.highlightError('password');
      ui.showMessage(
        data.errorKey || 'auth.alerts.invalid_credentials',
        'error'
      );
    }
  } catch {
    ui.showMessage('auth.alerts.conn_error', 'error');
  } finally {
    ui.setLoading(btn, false, 'auth.btn_login');
  }
}

/* REGISTER HANDLER */
async function handleRegister(e) {
  e.preventDefault();

  const btn = e.target.querySelector('.btn-submit');
  const pass = document.getElementById('password').value;
  const confirmPass = document.getElementById('confirm-password').value;
  const clan = document.getElementById('clan-select').value;

  if (pass !== confirmPass) {
    validator.highlightError('confirm-password');
    ui.showMessage('auth.alerts.pass_mismatch', 'error');
    return;
  }

  if (!clan) {
    validator.highlightError('clan-select');
    ui.showMessage('auth.alerts.clan_required', 'error');
    return;
  }

  const userData = {
    fullName: document.getElementById('name').value.trim(),
    email: document.getElementById('email').value.trim(),
    password: pass,
    clan,
    role: document.getElementById('role-select')?.value || 'coder',
  };

  ui.setLoading(btn, true, 'auth.btn_reg');

  try {
    const res = await authService.register(userData);
    const data = await res.json();

    if (res.ok) {
      ui.showMessage('auth.alerts.register_success', 'success', {
        clan: clan.toUpperCase(),
      });

      setTimeout(() => {
        const container = document.querySelector('.auth-container');
        if (container) {
          container.style.transition = 'all 0.3s ease-in-out';
          container.style.opacity = '0';
          container.style.transform = 'translateY(-10px)';
        }
        setTimeout(() => {
          window.location.href = './login.html';
        }, 300);
      }, 1000);
    } else {
      if (res.status === 409) {
        validator.highlightError('email');
        ui.showMessage('auth.alerts.user_exists', 'error');
      } else {
        ui.showMessage(data.errorKey || 'auth.alerts.conn_error', 'error');
      }
    }
  } catch (err) {
    console.error('[Register Error]:', err);
    ui.showMessage('auth.alerts.conn_error', 'error');
  } finally {
    ui.setLoading(btn, false, 'auth.btn_reg');
  }
}

/* INIT */
document.addEventListener('DOMContentLoaded', async () => {
  /* If already authenticated, skip login/register page */
  await guards.requireGuest();

  ui.setupPasswordToggles();

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  // Real-time password strength
  document.querySelectorAll('input[type="password"]').forEach((input) => {
    input.addEventListener('input', (e) => {
      const barId =
        input.id === 'confirm-password'
          ? 'strength-bar-confirm'
          : 'strength-bar';
      ui.updateStrengthUI(e.target.value, barId);
    });
  });

  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
});
