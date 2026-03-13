/**
 * src/core/utils/avatarService.js
 * Servicio compartido de avatares — Kairo
 *
 * Carga el avatar del usuario logueado desde /api/profile
 * y lo inyecta en cualquier elemento .topbar-avatar de la página.
 *
 * También expone loadCoderAvatar(userId, containerEl) para que el
 * dashboard TL muestre la foto del coder seleccionado.
 *
 * USO:
 *   import { loadMyAvatar, loadCoderAvatar } from '../../src/core/utils/avatarService.js';
 *   await loadMyAvatar();                          // en init() de cualquier dashboard
 *   await loadCoderAvatar(coder.id, el('detail-avatar')); // al seleccionar coder en TL
 */

const API = 'http://localhost:3000/api';

/* ── Cache en memoria para no re-fetchear en la misma sesión ── */
const _cache = new Map(); // userId → avatarUrl | null

/**
 * Renderiza un avatar en un contenedor dado.
 * - Si hay foto: <img>
 * - Si no: inicial del nombre sobre fondo accent
 */
function renderAvatarInto(container, avatarUrl, fullName = '') {
  if (!container) return;
  const initial = (fullName || '?').charAt(0).toUpperCase();

  if (avatarUrl) {
    container.innerHTML = `
      <img
        src="${avatarUrl}"
        alt="Avatar"
        class='topbar-avatar-img'
        style="width:100%;height:100%;object-fit:cover;border-radius:inherit;"
        onerror="this.parentElement.innerHTML='<span>${initial}</span>'"
      >`;
  } else {
    container.innerHTML = `<span>${initial}</span>`;
  }
}

/**
 * Carga y muestra el avatar del usuario logueado en TODOS los
 * elementos .topbar-avatar que haya en el DOM.
 */
export async function loadMyAvatar() {
  try {
    // Intenta desde cache primero
    if (_cache.has('me')) {
      _applyMyAvatar(_cache.get('me').avatarUrl, _cache.get('me').fullName);
      return;
    }

    const res = await fetch(`${API}/profile`, { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();

    const avatarUrl = data.metadata?.avatarUrl ?? null;
    const fullName = data.fullName ?? '';
    _cache.set('me', { avatarUrl, fullName });

    _applyMyAvatar(avatarUrl, fullName);
  } catch (err) {
    console.warn(
      '[avatarService] loadMyAvatar error (non-fatal):',
      err.message
    );
  }
}

function _applyMyAvatar(avatarUrl, fullName) {
  // Actualiza todos los .topbar-avatar de la página
  document.querySelectorAll('.topbar-avatar').forEach((container) => {
    renderAvatarInto(container, avatarUrl, fullName);
  });
}

/**
 * Carga y muestra el avatar de un coder específico.
 * @param {number} userId       - ID del coder
 * @param {HTMLElement} container - Elemento donde renderizar
 * @param {string} [fallbackName] - Nombre para la inicial si no hay foto
 */
export async function loadCoderAvatar(userId, container, fallbackName = '') {
  if (!container) return;

  // Muestra inicial inmediatamente mientras carga
  renderAvatarInto(container, null, fallbackName);

  try {
    // Usa cache si ya se cargó antes
    if (_cache.has(userId)) {
      const { avatarUrl, fullName } = _cache.get(userId);
      renderAvatarInto(container, avatarUrl, fullName || fallbackName);
      return;
    }

    const res = await fetch(`${API}/profile/${userId}`, {
      credentials: 'include',
    });
    if (!res.ok) return;
    const data = await res.json();

    const avatarUrl = data.metadata?.avatarUrl ?? null;
    const fullName = data.fullName ?? fallbackName;
    _cache.set(userId, { avatarUrl, fullName });

    renderAvatarInto(container, avatarUrl, fullName);
  } catch (err) {
    console.warn(
      '[avatarService] loadCoderAvatar error (non-fatal):',
      err.message
    );
  }
}

/**
 * Invalida el cache del usuario logueado.
 * Llamar después de guardar un nuevo avatar.
 */
export function invalidateMyAvatar() {
  _cache.delete('me');
}
