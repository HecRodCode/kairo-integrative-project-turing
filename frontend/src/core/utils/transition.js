/**
 * src/core/utils/transition.js
 * Page transition animations for auth views.
 */

document.addEventListener('DOMContentLoaded', () => {
  /* Fade in on page load */
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.4s ease-in-out';
  setTimeout(() => {
    document.body.style.opacity = '1';
  }, 10);

  /* Fade out on navigation between login ↔ register */
  const links = document.querySelectorAll(
    'a[href*="login.html"], a[href*="register.html"]'
  );

  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      const destination = link.getAttribute('href');
      e.preventDefault();

      // FIX: .card-content is the actual card wrapper in login.html / register.html
      const card = document.querySelector('.card-content');
      if (card) {
        card.style.transition = 'all 0.35s ease-in-out';
        card.style.transform = 'translateY(-20px)';
        card.style.opacity = '0';
      }

      document.body.style.opacity = '0';

      setTimeout(() => {
        window.location.href = destination;
      }, 380);
    });
  });
});
