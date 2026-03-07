/**
 * src/auth/auth-ui.js
 * UI Orchestrator for Authentication - Kairo Project
 */

// Import core services for authentication, session handling, and validation
import { authService } from './auth-service.js';
import { sessionManager } from './session.js';
import { validator } from './validation.js';

const ui = {
  // Detects the current application language from HTML, storage, or i18next
  getLang: () => {
    return (
      document.documentElement.lang ||
      localStorage.getItem('kairo-lang') ||
      (typeof i18next !== 'undefined' ? i18next.language : 'es')
    );
  },

  // Creates and animates global notification toasts for user feedback
  showMessage: (key, type = 'success', params = {}) => {
    const lang = ui.getLang();
    let message = resources[lang]?.translation;
    const keys = key.split('.');

    // Traverses the translation object to find the specific message key
    keys.forEach((k) => {
      message = message ? message[k] : null;
    });

    // Fallback to key if translation is missing, otherwise replace placeholders
    if (!message) {
      message = key;
    } else {
      Object.keys(params).forEach((param) => {
        message = message.replace(`{${param}}`, params[param]);
      });
    }

    // Dynamic creation of the message element with inline styles for high priority
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

    // Entry animation using the Web Animations API
    messageDiv.animate(
      [
        { transform: 'translateX(100%)', opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 },
      ],
      { duration: 300, easing: 'ease-out' }
    );

    // Auto-remove notification after a 4-second delay
    setTimeout(() => {
      messageDiv.style.opacity = '0';
      messageDiv.style.transform = 'translateX(20px)';
      setTimeout(() => messageDiv.remove(), 300);
    }, 4000);
  },

  // Toggles button loading state and replaces text with a spinner
  setLoading: (btn, isLoading, originalKey) => {
    const lang = ui.getLang();
    const keys = originalKey.split('.');
    let originalText = resources[lang]?.translation;

    // Retrieve original button text for restoration after loading
    keys.forEach((k) => (originalText = originalText ? originalText[k] : null));

    const loadingText = lang === 'es' ? 'Cargando...' : 'Loading...';

    // Prevent double submissions by disabling the button during requests
    btn.disabled = isLoading;
    btn.innerHTML = isLoading
      ? `<span class="spinner"></span> ${loadingText}`
      : originalText || originalKey;
  },

  // Updates the visual password strength bar based on complexity score
  updateStrengthUI: (password, targetPutId = 'strength-bar') => {
    const put = document.getElementById(targetPutId);
    if (!put) return;

    put.className = 'strength-bar';

    // Reset bar width if input is cleared
    if (password.length === 0) {
      put.style.width = '0';
      return;
    }

    // Calculate strength using the validator utility
    const strength = validator.checkPasswordStrength(password);

    // Apply color coding and width based on the calculated strength score
    if (strength.score === 1) {
      put.classList.add('strength-weak');
      put.style.width = '33%';
    } else if (strength.score === 2) {
      put.classList.add('strength-medium');
      put.style.width = '66%';
    } else if (strength.score >= 3) {
      put.classList.add('strength-strong');
      put.style.width = '100%';
    }
  },
};

/* EVENT MANAGERS  */

// Orchestrates the user login process and authentication flow
async function handleLogin(e) {
  e.preventDefault();

  // Identify the submit button to toggle loading animations
  const btn =
    e.target.querySelector('.btn-submit') ||
    e.target.querySelector('button[type="submit"]');

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  // Perform client-side email format validation before sending request
  if (!validator.validateEmail(email)) {
    validator.highlightError('email');
    ui.showMessage('auth.alerts.invalid_email', 'error');
    return;
  }

  // Visual feedback: Enable spinner and disable button interaction
  ui.setLoading(btn, true, 'auth.btn_login');

  try {
    // Execute login request through the authentication service
    const res = await authService.login({ email, password });
    const data = await res.json();

    if (res.ok) {
      // Success: Show welcome message and persist user session
      ui.showMessage('auth.alerts.login_success', 'success', {
        name: data.user.fullName,
      });

      sessionManager.saveUser(data.user);

      // Automatic redirection based on user permissions (Coder/Trainer)
      setTimeout(() => sessionManager.redirectByRole(data.user), 1500);
    } else {
      // Logic for failed credentials or server-side rejection
      validator.highlightError('password');
      ui.showMessage(
        data.errorKey || 'auth.alerts.invalid_credentials',
        'error'
      );
    }
  } catch (err) {
    // Handle unexpected network failures or server downtime
    ui.showMessage('auth.alerts.conn_error', 'error');
  } finally {
    // Cleanup: Restore button state and hide loading indicators
    ui.setLoading(btn, false, 'auth.btn_login');
  }
}

/* Handles the user registration process and form submission */
async function handleRegister(e) {
  e.preventDefault();

  // Select the submit button to manage loading states
  const btn =
    e.target.querySelector('.btn-submit') ||
    e.target.querySelector('button[type="submit"]');

  const pass = document.getElementById('password').value;
  const confirmPass = document.getElementById('confirm-password').value;
  const clan = document.getElementById('clan-select').value;

  // Validate that both password fields match exactly
  if (pass !== confirmPass) {
    validator.highlightError('confirm-password');
    ui.showMessage('auth.alerts.pass_mismatch', 'error');
    return;
  }

  // Ensure a clan is selected before proceeding
  if (!clan) {
    validator.highlightError('clan-select');
    ui.showMessage('auth.alerts.clan_required', 'error');
    return;
  }

  // Structure user data according to the application's requirements
  const userData = {
    fullName: document.getElementById('name').value.trim(),
    email: document.getElementById('email').value.trim(),
    password: pass,
    clan: clan,
    role: document.getElementById('role-select')?.value || 'coder',
  };

  // Visual feedback: Start button loading state
  ui.setLoading(btn, true, 'auth.btn_reg');

  try {
    const res = await authService.register(userData);
    const data = await res.json();

    if (res.ok) {
      // Success: Notify user and trigger transition to login
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

        // Redirect to login page after success animation
        setTimeout(() => {
          window.location.href = './login.html';
        }, 300);
      }, 1000);
    } else {
      // Server-side validation: Check for existing email (409 Conflict)
      if (res.status === 409) {
        validator.highlightError('email');
        ui.showMessage('auth.alerts.user_exists', 'error');
      } else {
        ui.showMessage(data.errorKey || 'auth.alerts.conn_error', 'error');
      }
    }
  } catch (err) {
    // Network or server communication error logging
    console.error('Error detallado:', err);
    ui.showMessage('auth.alerts.conn_error', 'error');
  } finally {
    // Reset button state regardless of the outcome
    ui.setLoading(btn, false, 'auth.btn_reg');
  }
}

/* UI INIT and main event listeners */
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const passwordInputs = document.querySelectorAll('input[type="password"]');

  // Real-time password strength validation logic
  passwordInputs.forEach((input) => {
    input.addEventListener('input', (e) => {
      const targetPut =
        input.id === 'confirm-password'
          ? 'strength-bar-confirm'
          : 'strength-bar';
      ui.updateStrengthUI(e.target.value, targetPut);
    });
  });

  // Attach submission handlers to available forms
  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);

  // Check for active social authentication sessions
  if (loginForm) {
    authService
      .checkSocial()
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            ui.showMessage('auth.alerts.login_success', 'success', {
              name: data.user.fullName,
            });
            sessionManager.saveUser(data.user);
            sessionManager.redirectByRole(data.user);
          }
        }
      })
      .catch(() => console.log('No active session.'));
  }
});
