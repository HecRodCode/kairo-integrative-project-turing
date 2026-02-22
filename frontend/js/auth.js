/**
 * Riwi Learning Platform - Authentication Service
 */

const API_URL = 'http://127.0.0.1:3000/api';

function showMessage(message, type = 'success') {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message message-${type}`;
  messageDiv.textContent = message;

  messageDiv.style.cssText = `
        position: fixed; top: 20px; right: 20px; padding: 15px 25px;
        border-radius: 8px; font-weight: 500; z-index: 9999;
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        ${type === 'success' ? 'background: #10b981; color: white;' : 'background: #ef4444; color: white;'}
    `;

  document.body.appendChild(messageDiv);

  setTimeout(() => {
    messageDiv.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => messageDiv.remove(), 300);
  }, 3000);
}

function redirectByUserRole(user) {
  const role = user.role.toLowerCase().trim();
  if (role === 'tl') {
    window.location.href = '../tl/dashboard.html';
  } else {
    window.location.href = user.firstLogin
      ? '../coder/onboarding.html'
      : '../coder/dashboard.html';
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const submitButton = event.target.querySelector('button');

  // Estos IDs deben existir en register.html
  const nameEl = document.getElementById('name');
  const emailEl = document.getElementById('email');
  const passEl = document.getElementById('password');
  const roleEl = document.getElementById('role-select');

  if (!nameEl || !emailEl || !passEl || !roleEl) return;

  const payload = {
    fullName: nameEl.value.trim(),
    email: emailEl.value.trim(),
    password: passEl.value,
    role: roleEl.value,
  };

  submitButton.disabled = true;
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (response.ok) {
      showMessage('Account created! Redirecting to login...', 'success');
      setTimeout(() => (window.location.href = './login.html'), 2000);
    } else {
      showMessage(data.error || 'Registration failed', 'error');
    }
  } catch (error) {
    showMessage('Server connection failed', 'error');
  } finally {
    submitButton.disabled = false;
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const submitButton = event.target.querySelector('button');

  const emailEl = document.getElementById('email');
  const passEl = document.getElementById('password');

  if (!emailEl || !passEl) return;

  submitButton.disabled = true;
  submitButton.textContent = 'Logging in...';

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email: emailEl.value.trim(),
        password: passEl.value,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      showMessage(`Welcome, ${data.user.fullName}!`, 'success');
      localStorage.setItem('user', JSON.stringify(data.user));
      setTimeout(() => redirectByUserRole(data.user), 1500);
    } else {
      showMessage(data.error || 'Invalid credentials', 'error');
    }
  } catch (error) {
    showMessage('Service unavailable', 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Login';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('register-form');
  const loginForm = document.getElementById('login-form');

  if (registerForm) registerForm.addEventListener('submit', handleRegister);
  if (loginForm) loginForm.addEventListener('submit', handleLogin);
});

// Estilos de animación para el showMessage
const styleTag = document.createElement('style');
styleTag.textContent = `
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
`;
document.head.appendChild(styleTag);
