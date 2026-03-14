/**
 * src/core/auth/otp-ui.js
 * OTP verification page logic — Kairo Project.
 */

import { sessionManager } from './session.js';

const API = 'https://kairo-integrative-project-turing-production.up.railway.app';

/* ── DOM ────────────────────────────────────────────────────── */
const inputs = document.querySelectorAll('#otp-inputs .otp-digit');
const verifyBtn = document.getElementById('verify-btn');
const resendBtn = document.getElementById('resend-btn');
const timerDisplay = document.getElementById('timer-display');
const timerBadge = document.getElementById('timer-badge');
const msgError = document.getElementById('msg-error');
const attemptsHint = document.getElementById('attempts-hint');
const displayEmail = document.getElementById('display-email');

/* ── State ──────────────────────────────────────────────────── */
let timerInterval = null;
let timeLeft = 300;
let attemptsLeft = 5;

/* ── Init ───────────────────────────────────────────────────── */
(function init() {
  // Read email — written by auth-ui.js handleRegister via sessionStorage
  const email = sessionStorage.getItem('kairo_pending_email');

  if (!email) {
    // No pending email → user came here directly, send back to register
    window.location.href = './register.html';
    return;
  }

  if (displayEmail) displayEmail.textContent = maskEmail(email);

  setupInputs();
  startTimer();
})();

/* ── Input navigation ───────────────────────────────────────── */
function setupInputs() {
  inputs.forEach((input, i) => {
    input.addEventListener('input', () => {
      input.value = input.value.toString().replace(/\D/g, '').slice(-1);
      input.classList.toggle('filled', input.value !== '');
      clearError();

      if (input.value && i < inputs.length - 1) inputs[i + 1].focus();

      // Auto-submit on last digit
      if (i === inputs.length - 1 && getCode().length === 6) {
        verifyBtn.click();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && i > 0) {
        inputs[i - 1].value = '';
        inputs[i - 1].classList.remove('filled');
        inputs[i - 1].focus();
      }
      if (!/^\d$/.test(e.key) && !['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
    });

    // Paste full code
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
      if (pasted.length === 6) {
        inputs.forEach((inp, idx) => {
          inp.value = pasted[idx] ?? '';
          inp.classList.toggle('filled', !!inp.value);
        });
        inputs[5].focus();
        clearError();
      }
    });
  });

  inputs[0].focus();
}

/* ── Timer ──────────────────────────────────────────────────── */
function startTimer() {
  clearInterval(timerInterval);
  timeLeft = 300;
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      timerBadge?.classList.add('expired');
      if (timerDisplay) timerDisplay.textContent = 'Expirado';
      resendBtn.disabled = false;
      verifyBtn.disabled = true;
    }
  }, 1000);
}

function updateTimerDisplay() {
  const m = Math.floor(timeLeft / 60)
    .toString()
    .padStart(2, '0');
  const s = (timeLeft % 60).toString().padStart(2, '0');
  if (timerDisplay) timerDisplay.textContent = `${m}:${s}`;
}

/* ── Helpers ────────────────────────────────────────────────── */
function getCode() {
  return Array.from(inputs)
    .map((i) => i.value)
    .join('');
}

function setLoading(loading) {
  verifyBtn.disabled = loading;
  verifyBtn.textContent = loading ? 'Verificando…' : 'Verificar código';
}

function showError(msg) {
  if (!msgError) return;
  msgError.textContent = msg;
  msgError.style.display = 'block';
  inputs.forEach((i) => i.classList.add('error-digit'));
  document.querySelector('.otp-grid')?.classList.add('shake');
  setTimeout(() => document.querySelector('.otp-grid')?.classList.remove('shake'), 400);
}

function clearError() {
  if (!msgError) return;
  msgError.style.display = 'none';
  inputs.forEach((i) => i.classList.remove('error-digit'));
}

function clearInputs() {
  inputs.forEach((i) => {
    i.value = '';
    i.classList.remove('filled', 'error-digit');
  });
  inputs[0].focus();
}

function maskEmail(email) {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  return local[0] + '*'.repeat(Math.max(local.length - 2, 3)) + local.slice(-1) + '@' + domain;
}

/* ── VERIFY ─────────────────────────────────────────────────── */
verifyBtn.addEventListener('click', async () => {
  const code = getCode();
  const email = sessionStorage.getItem('kairo_pending_email');

  if (code.length < 6) {
    showError('Ingresa los 6 dígitos del código.');
    return;
  }

  setLoading(true);
  clearError();

  try {
    const res = await fetch(`${API}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();

    if (res.ok && data.success) {
      clearInterval(timerInterval);

      // Clean up pending email
      sessionStorage.removeItem('kairo_pending_email');

      // Cache user in localStorage
      sessionManager.saveUser(data.user);

      // Visual feedback
      verifyBtn.textContent = '¡Verificado! ✓';
      verifyBtn.style.background = 'var(--color-success)';
      verifyBtn.style.borderColor = 'var(--color-success)';

      // ── Redirect: directo al onboarding ─────────────────────
      setTimeout(() => {
        window.location.href = '/kairo-integrative-project-turing/frontend/src/views/coder/onboarding.html';
      }, 800);
    } else {
      attemptsLeft--;

      if (attemptsLeft > 0) {
        showError(data.error ?? 'Código incorrecto.');
        attemptsHint.textContent = `${attemptsLeft} intento${attemptsLeft !== 1 ? 's' : ''} restante${attemptsLeft !== 1 ? 's' : ''}`;
      } else {
        showError('Demasiados intentos. Solicita un nuevo código.');
        verifyBtn.disabled = true;
        resendBtn.disabled = false;
        attemptsHint.textContent = '';
      }

      clearInputs();
      setLoading(false);
    }
  } catch {
    showError('Error de conexión. Intenta de nuevo.');
    setLoading(false);
  }
});

/* ── RESEND ─────────────────────────────────────────────────── */
resendBtn.addEventListener('click', async () => {
  const email = sessionStorage.getItem('kairo_pending_email');
  if (!email) {
    showError('No hay email pendiente.');
    return;
  }

  resendBtn.disabled = true;
  resendBtn.textContent = 'Enviando…';
  clearError();

  try {
    const res = await fetch(`${API}/api/auth/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email }),
    });
    const data = await res.json();

    if (res.ok) {
      attemptsLeft = 5;
      attemptsHint.textContent = '';
      verifyBtn.disabled = false;
      timerBadge?.classList.remove('expired');
      clearInputs();
      startTimer();
      resendBtn.textContent = 'Reenviar';
    } else {
      showError(data.error ?? 'No se pudo reenviar el código.');
      resendBtn.disabled = false;
      resendBtn.textContent = 'Reenviar';
    }
  } catch {
    showError('Error de conexión al reenviar.');
    resendBtn.disabled = false;
    resendBtn.textContent = 'Reenviar';
  }
});
