/**
 * src/core/auth/otp-ui.js
 * OTP verification page logic — Kairo Project.
 */

import { sessionManager } from './session.js';
import { API_BASE } from '../config.js'; 

/* ── DOM ELEMENTS ── */
const inputs = document.querySelectorAll('#otp-inputs .otp-digit');
const verifyBtn = document.getElementById('verify-btn');
const resendBtn = document.getElementById('resend-btn');
const timerDisplay = document.getElementById('timer-display');
const timerBadge = document.getElementById('timer-badge');
const msgError = document.getElementById('msg-error');
const attemptsHint = document.getElementById('attempts-hint');
const displayEmail = document.getElementById('display-email');

/* ── STATE ── */
let timerInterval = null;
let timeLeft = 300;
let attemptsLeft = 5;

/* ── INITIALIZATION ── */
(function init() {
  const email = sessionStorage.getItem('kairo_pending_email');

  if (!email) {
    // Redirect if no email is found to verify
    window.location.href = './login.html';
    return;
  }

  if (displayEmail) displayEmail.textContent = maskEmail(email);

  setupInputs();
  startTimer();
})();

/* ── INPUT LOGIC ── */
function setupInputs() {
  inputs.forEach((input, i) => {
    input.addEventListener('input', (e) => {
      // Allow only numbers
      const value = e.target.value.replace(/\D/g, '');
      input.value = value.slice(-1);
      input.classList.toggle('filled', input.value !== '');

      if (input.value && i < inputs.length - 1) {
        inputs[i + 1].focus();
      }

      // Auto-submit logic
      if (getCode().length === 6) {
        handleVerify();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && i > 0) {
        inputs[i - 1].focus();
      }
    });

    // Handle paste of 6-digit codes
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = e.clipboardData
        .getData('text')
        .replace(/\D/g, '')
        .slice(0, 6);
      if (pasted.length === 6) {
        pasted.split('').forEach((char, idx) => {
          inputs[idx].value = char;
          inputs[idx].classList.add('filled');
        });
        handleVerify();
      }
    });
  });

  if (inputs[0]) inputs[0].focus();
}

/* ── TIMER LOGIC ── */
function startTimer() {
  clearInterval(timerInterval);
  timeLeft = 300;
  resendBtn.disabled = true;
  if (timerBadge) timerBadge.classList.remove('expired');

  timerInterval = setInterval(() => {
    timeLeft--;
    const m = Math.floor(timeLeft / 60)
      .toString()
      .padStart(2, '0');
    const s = (timeLeft % 60).toString().padStart(2, '0');

    if (timerDisplay) timerDisplay.textContent = `${m}:${s}`;

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      if (timerBadge) timerBadge.classList.add('expired');
      if (timerDisplay) timerDisplay.textContent = '00:00';
      resendBtn.disabled = false;
      verifyBtn.disabled = true;
      showError('Code expired. Please request a new one.');
    }
  }, 1000);
}

/* ── CORE ACTIONS ── */

async function handleVerify() {
  const code = getCode();
  const email = sessionStorage.getItem('kairo_pending_email');

  if (code.length < 6) return;

  setLoading(true);
  clearError();

  try {
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, code }),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      clearInterval(timerInterval);
      sessionStorage.removeItem('kairo_pending_email');

      // Save authenticated user and redirect
      sessionManager.saveUser(data.user);

      verifyBtn.textContent = 'Success! ✓';
      verifyBtn.style.background = '#10b981';

      setTimeout(() => {
        // Safe redirect using sessionManager logic
        sessionManager.redirectByRole(data.user);
      }, 1000);
    } else {
      handleFailedAttempt(data.error || 'Invalid code');
    }
  } catch (err) {
    showError('Connection error. Please try again.');
  } finally {
    setLoading(false);
  }
}

async function handleResend() {
  const email = sessionStorage.getItem('kairo_pending_email');

  resendBtn.disabled = true;
  const originalText = resendBtn.textContent;
  resendBtn.textContent = 'Sending...';

  try {
    const res = await fetch(`${API_BASE}/auth/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      attemptsLeft = 5;
      verifyBtn.disabled = false;
      clearInputs();
      startTimer();
      showError('New code sent to your email.', 'success');
    } else {
      showError('Failed to resend code.');
    }
  } catch (err) {
    showError('Network error.');
  } finally {
    resendBtn.textContent = originalText;
  }
}

/* ── UI HELPERS ── */
function getCode() {
  return Array.from(inputs)
    .map((i) => i.value)
    .join('');
}

function handleFailedAttempt(msg) {
  attemptsLeft--;
  showError(`${msg}. Attempts left: ${attemptsLeft}`);

  if (attemptsLeft <= 0) {
    verifyBtn.disabled = true;
    resendBtn.disabled = false;
    showError('Too many attempts. Request a new code.');
  }

  clearInputs();
}

function setLoading(loading) {
  verifyBtn.disabled = loading;
  if (!loading) verifyBtn.textContent = 'Verify Code';
}

function showError(msg, type = 'error') {
  if (!msgError) return;
  msgError.textContent = msg;
  msgError.style.display = 'block';
  msgError.style.color = type === 'success' ? '#10b981' : '#ef4444';
  if (type === 'error') {
    document.querySelector('.otp-grid')?.classList.add('shake');
    setTimeout(
      () => document.querySelector('.otp-grid')?.classList.remove('shake'),
      400
    );
  }
}

function clearError() {
  if (msgError) msgError.style.display = 'none';
}

function clearInputs() {
  inputs.forEach((i) => {
    i.value = '';
    i.classList.remove('filled');
  });
  inputs[0].focus();
}

function maskEmail(email) {
  const [name, domain] = email.split('@');
  return `${name.substring(0, 3)}***@${domain}`;
}

/* ── EVENT LISTENERS ── */
verifyBtn.addEventListener('click', handleVerify);
resendBtn.addEventListener('click', handleResend);
