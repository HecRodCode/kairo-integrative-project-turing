/**
 * src/core/utils/theme.js
 * Responsabilidad ÚNICA: dark / light mode.
 * Cárgalo con `defer` en TODAS las páginas.
 */

/* ── 1. Aplica el tema ANTES de pintar → evita flash blanco/negro ── */
(function () {
  const theme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
})();

/* ── 2. Conecta el botón una vez que el DOM esté listo ── */
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('theme-toggle');
  const moon = document.getElementById('moon-icon');
  const sun = document.getElementById('sun-icon');

  /* Sincroniza íconos con el estado actual */
  _syncIcons(document.documentElement.getAttribute('data-theme') === 'dark', moon, sun);

  if (btn) {
    btn.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const newTheme = isDark ? 'light' : 'dark';

      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      _syncIcons(!isDark, moon, sun);
    });
  }
});

function _syncIcons(isDark, moon, sun) {
  if (moon) moon.style.display = isDark ? 'block' : 'none';
  if (sun) sun.style.display = isDark ? 'none' : 'block';
}
