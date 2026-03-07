/**
 * src/auth/auth-ui.js
 * Orquestador de Interfaz de Usuario para Autenticación (Cohorte 6)
 */
import { authService } from './auth-service.js';
import { sessionManager } from './session.js';
import { validator } from './validation.js';

const ui = {
  getLang: () => {
    return (
      document.documentElement.lang ||
      localStorage.getItem('kairo-lang') ||
      (typeof i18next !== 'undefined' ? i18next.language : 'es')
    );
  },

  showMessage: (key, type = 'success', params = {}) => {
    const lang = ui.getLang();
    let message = resources[lang]?.translation;
    const keys = key.split('.');
    keys.forEach((k) => {
      message = message ? message[k] : null;
    });
    if (!message) {
      message = key;
    } else {
      Object.keys(params).forEach((param) => {
        message = message.replace(`{${param}}`, params[param]);
      });
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.style.cssText = `
      position: fixed; top: 20px; right: 20px; padding: 15px 25px;
      border-radius: 12px; font-weight: 600; z-index: 9999;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
      display: flex; align-items: center; gap: 10px;
      transition: all 0.3s ease;
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
      color: white; border-left: 5px solid ${type === 'success' ? '#064e3b' : '#7f1d1d'};
      font-family: 'Inter', sans-serif;
    `;

    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    messageDiv.animate(
      [
        { transform: 'translateX(100%)', opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 },
      ],
      { duration: 300, easing: 'ease-out' }
    );

    setTimeout(() => {
      messageDiv.style.opacity = '0';
      messageDiv.style.transform = 'translateX(20px)';
      setTimeout(() => messageDiv.remove(), 300);
    }, 4000);
  },

  setLoading: (btn, isLoading, originalKey) => {
    const lang = ui.getLang();
    const keys = originalKey.split('.');
    let originalText = resources[lang]?.translation;
    keys.forEach((k) => (originalText = originalText ? originalText[k] : null));

    const loadingText = lang === 'es' ? 'Cargando...' : 'Loading...';

    btn.disabled = isLoading;
    btn.innerHTML = isLoading
      ? `<span class="spinner"></span> ${loadingText}`
      : originalText || originalKey;
  },

  updateStrengthUI: (password) => {
    const meter = document.getElementById('strength-bar');
    const meterConfirm = document.getElementById('strength-bar-confirm');
    if (!meter) return;

    const strength = validator.checkPasswordStrength(password);
    [meter, meterConfirm].forEach((m) => {
      if (!m) return;
      m.className = 'strength-bar';
      if (password.length === 0) {
        m.style.width = '0';
      } else if (strength.score === 1) {
        m.classList.add('strength-weak');
      } else if (strength.score === 2) {
        m.classList.add('strength-medium');
      } else {
        m.classList.add('strength-strong');
      }
    });
  },
};

/*  EVENT MANAGERS  */
async function handleLogin(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button');
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
  } catch (err) {
    ui.showMessage('auth.alerts.conn_error', 'error');
  } finally {
    ui.setLoading(btn, false, 'auth.btn_login');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button');
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
    clan: clan,
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

      setTimeout(() => (window.location.href = './login.html'), 1000);
    } else {
      ui.showMessage(data.errorKey || 'auth.alerts.conn_error', 'error');
    }
  } catch (err) {
    ui.showMessage('auth.alerts.conn_error', 'error');
  } finally {
    ui.setLoading(btn, false, 'auth.btn_reg');
  }
}

/* INIT */
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const passInput = document.getElementById('password');

  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);

  if (passInput) {
    passInput.addEventListener('input', (e) =>
      ui.updateStrengthUI(e.target.value)
    );
  }

  if (loginForm) {
    authService
      .checkSocial()
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            ui.showMessage('Successful authentication', 'success');
            sessionManager.saveUser(data.user);
            sessionManager.redirectByRole(data.user);
          }
        }
      })
      .catch(() => console.log('No active session.'));
  }
});
