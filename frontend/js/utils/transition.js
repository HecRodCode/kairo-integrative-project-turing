/**
 * KAIRO Page Transitions Logic
 */
document.addEventListener('DOMContentLoaded', () => {
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.5s ease-in-out';

  setTimeout(() => {
    document.body.style.opacity = '1';
  }, 10);
  const links = document.querySelectorAll(
    'a[href*="login.html"], a[href*="register.html"]'
  );

  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      const destination = link.getAttribute('href');

      e.preventDefault();

      const container = document.querySelector('.auth-container');
      if (container) {
        container.style.transform = 'translateY(-20px)';
        container.style.opacity = '0';
        container.style.transition = 'all 0.4s ease-in-out';
      }

      document.body.style.opacity = '0';

      setTimeout(() => {
        window.location.href = destination;
      }, 400);
    });
  });
});
