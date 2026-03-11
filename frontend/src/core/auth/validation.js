export const validator = {
  // Validates email format using a standard regular expression
  validateEmail: (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  },

  // Validates email format using a standard regular expression
  checkPasswordStrength: (pass) => {
    if (pass.length === 0) return { score: 0, msg: '' };
    if (pass.length < 8) return { score: 1, msg: 'Débil' };

    const hasUpperCase = /[A-Z]/.test(pass);
    const hasNumbers = /\d/.test(pass);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pass);

    // Criteria for strong password: mixed case, numbers, special characters, and length
    if (hasUpperCase && hasNumbers && hasSpecial && pass.length >= 10) {
      return { score: 3, msg: 'Fuerte' };
    }
    return { score: 2, msg: 'Media' };
  },

  // Checks if two values match exactly (e.g., for password confirmation)
  doMatch: (val1, val2) => {
    return val1 === val2;
  },

  // Applies visual error feedback and triggers a shake animation on invalid inputs
  highlightError: (elementId) => {
    const el = document.getElementById(elementId);
    if (el) {
      el.classList.add('input-error', 'shake');

      setTimeout(() => {
        el.classList.remove('shake');
      }, 400);

      const eventType = el.tagName === 'SELECT' ? 'change' : 'input';

      // Automatically clears the error state once the user starts correcting the field
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

  // Removes error classes and resets visual styles for a specific element
  clearError: (elementId) => {
    const el = document.getElementById(elementId);
    if (el) {
      el.classList.remove('input-error');
      el.style.borderColor = '';
    }
  },

  // Verifies that multiple fields are not empty and highlights any missing ones
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
