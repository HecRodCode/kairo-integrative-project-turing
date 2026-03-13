/**
 * src/core/utils/theme.js
 * Responsabilidad ÚNICA: dark / light mode.
 * Cárgalo con `defer` en TODAS las páginas.
 */

/* ── 1. Aplica el tema ANTES de pintar → evita flash blanco/negro ── */
(function () {
  const theme = localStorage.getItem('kairo_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
})();

/* ── 2. Conecta el botón una vez que el DOM esté listo ── */
document.addEventListener('DOMContentLoaded', () => {
  /* ── Botón principal (theme-toggle) ── */
  const btn = document.getElementById('theme-toggle');
  const moon = document.getElementById('moon-icon');
  const sun = document.getElementById('sun-icon');

  _syncIcons(
    document.documentElement.getAttribute('data-theme') === 'dark',
    moon,
    sun
  );

  if (btn) {
    btn.addEventListener('click', () => {
      const isDark =
        document.documentElement.getAttribute('data-theme') === 'dark';
      const newTheme = isDark ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('kairo_theme', newTheme);
      _syncIcons(!isDark, moon, sun);
      // Sincroniza también botones de dashboard/activities TL
      const dashMoon = document.getElementById('icon-moon');
      const dashSun = document.getElementById('icon-sun');
      _syncIcons(!isDark, dashMoon, dashSun);
    });
  }

  /* ── Soporte para botón de TL y Coder (btn-theme) ── */
  const dashBtn = document.getElementById('btn-theme');
  const dashMoon = document.getElementById('icon-moon');
  const dashSun = document.getElementById('icon-sun');

  if (dashBtn) {
    _syncIcons(
      document.documentElement.getAttribute('data-theme') === 'dark',
      dashMoon,
      dashSun
    );

    dashBtn.addEventListener('click', () => {
      const isDark =
        document.documentElement.getAttribute('data-theme') === 'dark';
      const newTheme = isDark ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('kairo_theme', newTheme);
      _syncIcons(!isDark, moon, sun);
      _syncIcons(!isDark, dashMoon, dashSun);
    });
  }
});

function _syncIcons(isDark, moon, sun) {
  if (moon) moon.style.display = isDark ? 'block' : 'none';
  if (sun) sun.style.display = isDark ? 'none' : 'block';
}

// MODAL

 function openHelp() {
        document.getElementById('helpOverlay').classList.add('open');
        document.body.style.overflow = 'hidden';
      }
      function closeHelp() {
        document.getElementById('helpOverlay').classList.remove('open');
        document.body.style.overflow = '';
      }
      function closeHelpOutside(e) {
        if (e.target === document.getElementById('helpOverlay')) closeHelp();
      }
      document.addEventListener('keydown', e => { if (e.key === 'Escape') closeHelp(); });
