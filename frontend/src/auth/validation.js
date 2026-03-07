/**
 * src/auth/validation.js
 * Validaciones de Formulario Profesionales y Feedback Visual
 */

export const validator = {
  validateEmail: (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  },
  checkPasswordStrength: (pass) => {
    if (pass.length === 0) return { score: 0, msg: '' };
    if (pass.length < 8) return { score: 1, msg: 'Débil' };

    const hasUpperCase = /[A-Z]/.test(pass);
    const hasNumbers = /\d/.test(pass);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    if (hasUpperCase && hasNumbers && hasSpecial && pass.length >= 10) {
      return { score: 3, msg: 'Fuerte' };
    }
    return { score: 2, msg: 'Media' };
  },

  doMatch: (val1, val2) => {
    return val1 === val2;
  },
  highlightError: (elementId) => {
    const el = document.getElementById(elementId);
    if (el) {
      el.classList.add('input-error', 'shake');

      setTimeout(() => {
        el.classList.remove('shake');
      }, 400);

      const eventType = el.tagName === 'SELECT' ? 'change' : 'input';

      el.addEventListener(
        eventType,
        function handleCorrection() {
          validator.clearError(elementId);
          el.removeEventListener(eventType, handleCorrection);
        },
        { once: true }
      );
    }
  },

  clearError: (elementId) => {
    const el = document.getElementById(elementId);
    if (el) {
      el.classList.remove('input-error');
      el.style.borderColor = '';
    }
  },

  validateRequired: (fields) => {
    let isValid = true;
    fields.forEach((id) => {
      const el = document.getElementById(id);
      if (!el || !el.value || el.value.trim() === '') {
        validator.highlightError(id);
        isValid = false;
      }
    });
    return isValid;
  },
};
