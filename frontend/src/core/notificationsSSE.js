/**
 * src/core/notificationsSSE.js
 */

import { API_BASE } from './config.js';

class NotificationService {
  constructor() {
    this.eventSource = null;
    this.isConnected = false;
    this._everConnected = false;
    this._connecting = false;
    this._retryDelay = 5000;
    this._retryTimer = null;
    this.userRole = null;
    this.toastTimer = null;
  }

  connect(userRole) {
    if (this.isConnected || this._connecting) return;

    if (!document.getElementById('btn-notif')) return;

    this._connecting = true;
    this.userRole = userRole;

    this.eventSource = new EventSource(`${API_BASE}/notifications/stream`, {
      withCredentials: true,
    });

    this.eventSource.onopen = () => {
      this.isConnected = true;
      this._connecting = false;
      this._everConnected = true;
      this._retryDelay = 5000;
      console.log('[SSE] Conectado — notificaciones en tiempo real activas.');
    };

    this.eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (!payload?.type) return;

        if (payload.type === 'NEW_NOTIFICATION') {
          this._handleNewNotification(payload.data);
        }
      } catch (err) {
        console.error('[SSE] Error parseando notificación:', err.message);
      }
    };

    this.eventSource.onerror = () => {
      this.isConnected = false;
      this._connecting = false;
      this.eventSource?.close();
      this.eventSource = null;

      if (!this._everConnected) {
        console.warn(
          '[SSE] Stream no disponible — probablemente backend local apagado.'
        );
        return;
      }

      if (document.hidden) {
        const onVisible = () => {
          document.removeEventListener('visibilitychange', onVisible);
          this.connect(this.userRole);
        };
        document.addEventListener('visibilitychange', onVisible);
        return;
      }

      this._retryDelay = Math.min(this._retryDelay * 2, 60000);
      console.warn(`[SSE] Reconectando en ${this._retryDelay / 1000}s...`);
      this._retryTimer = setTimeout(
        () => this.connect(this.userRole),
        this._retryDelay
      );
    };

    // Cablear UI una sola vez
    this._whenDOMReady(() => {
      this._wireToast();
      this._wireBellDropdown();
      this._wireDeleteHandler();
    });
  }

  disconnect() {
    clearTimeout(this._retryTimer);
    this.eventSource?.close();
    this.eventSource = null;
    this.isConnected = false;
    this._connecting = false;
    this._everConnected = false;
  }

  /* ── Manejo de nueva notificación entrante ── */
  _handleNewNotification(data) {
    this.showVisualToast(data);
    this.updateBell(+1);
    this.injectToDropdown(data);
    window.dispatchEvent(
      new CustomEvent('kairo-notification', { detail: data })
    );
  }

  /* ── DOM ready helper ── */
  _whenDOMReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  /* ── Toast ── */
  _wireToast() {
    if (document.getElementById('toast')) return;
    const div = document.createElement('div');
    div.id = 'toast';
    div.className =
      this.userRole === 'coder' ? 'toast-coder hidden' : 'toast hidden';
    div.innerHTML = `
      <i class="fa-solid fa-bell" id="toast-icon"></i>
      <span id="toast-msg">—</span>`;
    document.body.appendChild(div);
  }

  /* ── Bell + Dropdown ── */
  _wireBellDropdown() {
    const btn = document.getElementById('btn-notif');
    const dropdown = document.getElementById('notif-dropdown');
    const list = document.getElementById('notif-list');

    if (!btn || !dropdown || !list) {
      console.warn(
        '[SSE] Elementos del bell no encontrados — saltando wire-up.'
      );
      return;
    }

    if (btn.dataset.ssebound) return;
    btn.dataset.ssebound = 'true';

    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const isHidden = dropdown.classList.contains('hidden');
      dropdown.classList.toggle('hidden', !isHidden);

      if (isHidden) {
        await this._loadNotificationsIntoDropdown(list);
      }
    });

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });
  }

  async _loadNotificationsIntoDropdown(list) {
    list.innerHTML =
      '<p class="notif-empty" style="opacity:0.5">Cargando...</p>';

    try {
      const res = await fetch(`${API_BASE}/notifications`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      this._setBadgeCount(data.unread || 0);

      list.innerHTML = data.notifications?.length
        ? data.notifications
            .slice(0, 10)
            .map((n) => this._notifItemHTML(n))
            .join('')
        : '<p class="notif-empty">Sin notificaciones nuevas</p>';

      fetch(`${API_BASE}/notifications/read`, {
        method: 'POST',
        credentials: 'include',
      }).catch(() => {});
    } catch (err) {
      console.error('[SSE] Error cargando notificaciones:', err.message);
      list.innerHTML =
        '<p class="notif-empty" style="color:var(--color-error)">Error al cargar</p>';
    }
  }

  _wireDeleteHandler() {
    const list = document.getElementById('notif-list');
    if (!list || list.dataset.ssedelbound) return;
    list.dataset.ssedelbound = 'true';

    list.addEventListener('click', async (e) => {
      const delBtn = e.target.closest('.btn-delete-notif');
      if (!delBtn) return;
      e.stopPropagation();

      const id = delBtn.dataset.id;
      try {
        const res = await fetch(`${API_BASE}/notifications/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (res.ok) {
          document.getElementById(`notif-box-${id}`)?.remove();
          if (!list.querySelector('.notif-item')) {
            list.innerHTML =
              '<p class="notif-empty">Sin notificaciones nuevas</p>';
          }
        }
      } catch (err) {
        console.error('[SSE] Error eliminando notificación:', err.message);
      }
    });
  }

  injectToDropdown(notif) {
    const list = document.getElementById('notif-list');
    if (!list) return;
    list.querySelector('.notif-empty')?.remove();
    list.insertAdjacentHTML('afterbegin', this._notifItemHTML(notif, true));
  }

  /* ── Toast visual ── */
  showVisualToast(notification) {
    const ICONS = {
      feedback: 'fa-comment-dots',
      assignment: 'fa-clipboard-list',
      feedback_read: 'fa-envelope-open-text',
      system: 'fa-bell',
    };
    const TYPES = {
      feedback: 'warning',
      assignment: 'success',
      feedback_read: 'info',
      system: 'info',
    };

    const toastEl = document.getElementById('toast');
    const toastIcon = document.getElementById('toast-icon');
    const toastMsg = document.getElementById('toast-msg');
    if (!toastEl || !toastIcon || !toastMsg) return;

    toastIcon.className = `fa-solid ${ICONS[notification.type] || 'fa-bell'}`;
    toastMsg.textContent = notification.title;
    toastEl.className = toastEl.className
      .replace(/\b(success|warning|error|info|hidden)\b/g, '')
      .trim();
    toastEl.classList.add(TYPES[notification.type] || 'info');

    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toastEl.classList.add('hidden'), 4500);
  }

  /* ── Badge counter ── */
  updateBell(delta = 0) {
    const dot = document.getElementById('notif-dot');
    if (!dot) return;
    const current = parseInt(dot.textContent) || 0;
    const next = Math.max(0, current + delta);
    if (next > 0) {
      dot.classList.remove('hidden');
      dot.textContent = next > 9 ? '9+' : String(next);
    } else {
      dot.classList.add('hidden');
      dot.textContent = '';
    }
  }

  _setBadgeCount(count) {
    const dot = document.getElementById('notif-dot');
    if (!dot) return;
    if (count > 0) {
      dot.classList.remove('hidden');
      dot.textContent = count > 9 ? '9+' : String(count);
    } else {
      dot.classList.add('hidden');
      dot.textContent = '';
    }
  }

  /* ── HTML ── */
  _notifItemHTML(n, isNew = false) {
    const unread = isNew || !n.is_read;
    return `
      <div class="notif-item ${unread ? 'notif-item-unread' : ''}" id="notif-box-${n.id}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <p class="notif-title" style="margin:0;font-size:13px;font-weight:500">
            ${this._esc(n.title)}
          </p>
          <button
            class="btn-delete-notif"
            data-id="${n.id}"
            title="Eliminar"
            type="button"
            style="background:none;border:none;color:var(--text-muted);cursor:pointer;
                   font-size:12px;padding:2px;flex-shrink:0;">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <p class="notif-text" style="font-size:12px;margin:4px 0 0;color:var(--text-muted)">
          ${this._esc(n.message || n.text || '')}
        </p>
        <p class="notif-time" style="font-size:11px;margin-top:6px;color:var(--text-muted)">
          ${this._ftm(n.created_at)}
        </p>
      </div>`;
  }

  /* ── Utils ── */
  _esc(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  _ftm(iso) {
    if (!iso) return 'Ahora mismo';
    const diff = (Date.now() - new Date(iso)) / 1000;
    if (diff < 60) return 'hace un momento';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
    return `hace ${Math.floor(diff / 86400)}d`;
  }
}

export const notificationsClient = new NotificationService();
