/**
 * src/core/utils/avatarService.js
 * Servicio compartido de avatares — Kairo
 */

import { API_BASE } from '../config.js';

const _cache = new Map();

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

export async function loadMyAvatar() {
  try {
    if (_cache.has('me')) {
      _applyMyAvatar(_cache.get('me').avatarUrl, _cache.get('me').fullName);
      return;
    }

    const res = await fetch(`${API_BASE}/profile`, { credentials: 'include' });
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

export async function loadCoderAvatar(userId, container, fallbackName = '') {
  if (!container) return;

  renderAvatarInto(container, null, fallbackName);

  try {
    if (_cache.has(userId)) {
      const { avatarUrl, fullName } = _cache.get(userId);
      renderAvatarInto(container, avatarUrl, fullName || fallbackName);
      return;
    }

    const res = await fetch(`${API_BASE}/profile/${userId}`, {
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

export function invalidateMyAvatar() {
  _cache.delete('me');
}
