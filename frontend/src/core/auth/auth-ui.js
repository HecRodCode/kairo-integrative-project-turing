/**
 * src/core/auth/auth-ui.js
 * Login + Register UI logic — Kairo Project
 */

import { authService } from './auth-service.js';
import { sessionManager, guards } from './session.js';
import { validator } from './validation.js';
import { API_BASE } from '../config.js';

/* ── i18n helper ── */
const t = (key, params = {}) => {
  let msg = typeof window.i18nT === 'function' ? window.i18nT(key) : key;
  Object.entries(params).forEach(([k, v]) => {
    msg = msg.replace(`{${k}}`, v);
  });
  return msg;
};

/* ── Strength bar ─────────────────────────────────────────── */
function setupStrengthBar() {
  const passwordInput = document.getElementById('password');
  const bar = document.getElementById('strength-bar');
  if (!passwordInput || !bar) return;

  let hint = document.getElementById('strength-hint');
  if (!hint) {
    hint = document.createElement('p');
    hint.id = 'strength-hint';
    hint.style.cssText =
      'font-size:12px;margin:4px 0 0;min-height:16px;transition:color 0.3s;';
    bar.parentElement.appendChild(hint);
  }

  passwordInput.addEventListener('input', () => {
    const pass = passwordInput.value;
    const { score } = validator.checkPasswordStrength(pass);

    // Removemos todas las clases de estado anteriores
    bar.className = 'strength-bar';

    if (pass.length === 0) {
      bar.style.width = '0%';
      hint.textContent = '';
      return;
    }

    // score 1 = débil, 2 = media, 3 = fuerte
    const stateMap = {
      1: { cls: 'strength-weak', width: '33%', color: '#ef4444' },
      2: { cls: 'strength-medium', width: '66%', color: '#f59e0b' },
      3: { cls: 'strength-strong', width: '100%', color: '#10b981' },
    };

    const state = stateMap[score];
    bar.classList.add(state.cls);
    bar.style.width = state.width;
    hint.style.color = state.color;
    hint.textContent = t(`auth.password_strength.${score}`);
  });
}

/* ── UI helpers ───────────────────────────────────────────── */
const ui = {
  getLang: () =>
    localStorage.getItem('kairo-lang') || document.documentElement.lang || 'es',

  showMessage(key, type = 'success', params = {}) {
    const message = t(key, params);
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

  setLoading(btn, isLoading, labelKey) {
    if (!btn) return;
    const lang = this.getLang();
    const loadingText = lang === 'es' ? 'Cargando...' : 'Loading...';
    btn.disabled = isLoading;
    btn.innerHTML = isLoading
      ? `<span class="spinner"></span> ${loadingText}`
      : t(labelKey);
  },

  setupPasswordToggles() {
    document.querySelectorAll('.toggle-password').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.getAttribute('data-target'));
        const eyeOpen = btn.querySelector('.eye-open');
        const eyeClosed = btn.querySelector('.eye-closed');
        if (!input || !eyeOpen || !eyeClosed) return;
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        eyeOpen.style.display = isPassword ? 'none' : 'block';
        eyeClosed.style.display = isPassword ? 'block' : 'none';
      });
    });
  },

  fadeOutCard(callback) {
    const card =
      document.querySelector('.card-content') ||
      document.querySelector('.content-form') ||
      document.body;
    card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    card.style.opacity = '0';
    card.style.transform = 'translateY(-10px)';
    setTimeout(callback, 320);
  },
};

/* ── HANDLERS ─────────────────────────────────────────────── */
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
    } else if (res.status === 403 && data.requiresOtp) {
      ui.showMessage('auth.alerts.verify_email_first', 'error');
      sessionStorage.setItem('kairo_pending_email', email);
      setTimeout(
        () =>
          ui.fadeOutCard(() => {
            window.location.href = './email-validation.html';
          }),
        1500
      );
    } else {
      ui.showMessage(data.error || 'auth.alerts.invalid_credentials', 'error');
    }
  } catch {
    ui.showMessage('auth.alerts.conn_error', 'error');
  } finally {
    ui.setLoading(btn, false, 'auth.btn_login');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = e.target.querySelector('.btn-submit');
  const email = document.getElementById('email').value.trim();
  const pass = document.getElementById('password').value;
  const confirm = document.getElementById('confirm-password').value;
  const fullName = document.getElementById('name').value.trim();
  const clanId = document.getElementById('clan-select').value;

  /* ── Validations ── */
  if (!validator.validateRequired(['name', 'email', 'clan-select'])) {
    ui.showMessage('auth.alerts.required_fields', 'error');
    return;
  }

  if (!validator.validateEmail(email)) {
    validator.highlightError('email');
    ui.showMessage('auth.alerts.invalid_email', 'error');
    return;
  }

  if (!validator.isPasswordStrong(pass)) {
    validator.highlightError('password');
    ui.showMessage('auth.alerts.weak_password', 'error');
    document.getElementById('password')?.focus();
    return;
  }

  if (!validator.doMatch(pass, confirm)) {
    validator.highlightError('confirm-password');
    ui.showMessage('auth.alerts.pass_mismatch', 'error');
    return;
  }

  const userData = { fullName, email, password: pass, clanId, role: 'coder' };

  ui.setLoading(btn, true, 'auth.btn_reg');

  try {
    const res = await authService.register(userData);
    const data = await res.json();

    if (res.ok) {
      sessionStorage.setItem('kairo_pending_email', email);
      ui.showMessage('auth.alerts.register_success', 'success');
      setTimeout(() => {
        ui.fadeOutCard(() => {
          window.location.href = './email-validation.html';
        });
      }, 1000);
    } else if (res.status === 409) {
      ui.showMessage('auth.alerts.email_exists', 'success');
      sessionStorage.setItem('kairo_pending_email', email);
      setTimeout(() => {
        window.location.href = './email-validation.html';
      }, 1000);
    } else {
      ui.showMessage(data.error || 'auth.alerts.conn_error', 'error');
    }
  } catch {
    ui.showMessage('auth.alerts.conn_error', 'error');
  } finally {
    ui.setLoading(btn, false, 'auth.btn_reg');
  }
}

/* ── INIT ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  await guards.requireGuest();

  // OAuth buttons
  document
    .querySelectorAll('.btn-social.google')
    .forEach((a) => (a.href = `${API_BASE}/auth/google`));
  document
    .querySelectorAll('.btn-social.github')
    .forEach((a) => (a.href = `${API_BASE}/auth/github`));

  ui.setupPasswordToggles();

  setupStrengthBar();

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
});

//  information abount password
  const input   = document.getElementById('password');
  const tooltip = document.getElementById('pass-tooltip');

  input.addEventListener('focus', () => tooltip.classList.add('visible'));
  input.addEventListener('blur',  () => tooltip.classList.remove('visible'))

