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
    this._retryDelay = 8000;
    this._retryTimer = null;
    this._uiWired = false;
    this.userRole = null;
    this.toastTimer = null;
  }

  async connect(userRole) {
    window.addEventListener(
      'pagehide',
      () => {
        this.eventSource?.close();
        this.eventSource = null;
        this.isConnected = false;
        this._connecting = false;
      },
      { once: true }
    );

    // Evita doble conexión
    if (this.isConnected || this._connecting) return;

    // Solo conecta si existe el bell en el DOM — si no hay bell no hay página de usuario
    if (!document.getElementById('btn-notif')) return;

    this._connecting = true;
    this.userRole = userRole;

    // Cablear UI solo una vez, antes de abrir el stream
    if (!this._uiWired) {
      this._wireToast();
      this._wireBellDropdown();
      this._wireDeleteHandler();
      this._uiWired = true;
    }

    // Cargar conteo real del servidor ANTES de mostrar el badge
    // Esto evita el badge fantasma al recargar
    await this._syncBadgeFromServer();

    this.eventSource = new EventSource(`${API_BASE}/notifications/stream`, {
      withCredentials: true,
    });

    this.eventSource.onopen = () => {
      this.isConnected = true;
      this._connecting = false;
      this._everConnected = true;
      this._retryDelay = 8000;
      console.log('[SSE] Conectado — notificaciones en tiempo real activas.');
    };

    this.eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (!payload?.type) return;
        if (payload.type === 'NEW_NOTIFICATION') {
          this._handleNewNotification(payload.data);
        }
        // Ignorar silenciosamente CONNECTED y ping
      } catch {
        // JSON parse error — ignorar silenciosamente
      }
    };

    this.eventSource.onerror = () => {
      this.isConnected = false;
      this._connecting = false;

      if (document.visibilityState === 'hidden' || !document.body) {
        this.eventSource?.close();
        this.eventSource = null;
        return;
      }

      this.eventSource?.close();
      this.eventSource = null;

      if (!this._everConnected) {
        if (window.location.hostname === 'localhost') {
          console.warn('[SSE] Stream no disponible — backend no responde.');
        }
        return;
      }

      if (document.hidden) {
        document.addEventListener(
          'visibilitychange',
          () => {
            this._connecting = false;
            this.connect(this.userRole);
          },
          { once: true }
        );
        return;
      }

      // Backoff exponencial — solo logear en desarrollo
      this._retryDelay = Math.min(this._retryDelay * 2, 60000);
      if (window.location.hostname === 'localhost') {
        console.warn(`[SSE] Reconectando en ${this._retryDelay / 1000}s...`);
      }
      this._retryTimer = setTimeout(() => {
        this._connecting = false;
        this.connect(this.userRole);
      }, this._retryDelay);
    };
  }

  disconnect() {
    clearTimeout(this._retryTimer);
    this.eventSource?.close();
    this.eventSource = null;
    this.isConnected = false;
    this._connecting = false;
    this._everConnected = false;
    this._uiWired = false;
  }

  /* ════════════════════════════════
     SYNC BADGE — lee el conteo real
     del servidor al iniciar
  ════════════════════════════════ */
  async _syncBadgeFromServer() {
    try {
      const res = await fetch(`${API_BASE}/notifications`, {
        credentials: 'include',
      });
      if (!res.ok) return;
      const data = await res.json();
      this._setBadgeCount(0);

      if ((data.unread ?? 0) > 0) {
        fetch(`${API_BASE}/notifications/read`, {
          method: 'POST',
          credentials: 'include',
        }).catch(() => {});
      }
    } catch {
      this._setBadgeCount(0);
    }
  }

  /* ════════════════════════════════
     NUEVA NOTIFICACIÓN ENTRANTE
  ════════════════════════════════ */
  _handleNewNotification(data) {
    this.showVisualToast(data);
    this.updateBell(+1);
    this.injectToDropdown(data);
    window.dispatchEvent(
      new CustomEvent('kairo-notification', { detail: data })
    );
  }

  /* ════════════════════════════════
     TOAST
  ════════════════════════════════ */
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

  /* ════════════════════════════════
     BELL + DROPDOWN
  ════════════════════════════════ */
  _wireBellDropdown() {
    const btn = document.getElementById('btn-notif');
    const dropdown = document.getElementById('notif-dropdown');
    const list = document.getElementById('notif-list');
    if (!btn || !dropdown || !list) return;
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

      // Actualizar badge con el conteo real
      this._setBadgeCount(data.unread ?? 0);

      list.innerHTML = data.notifications?.length
        ? data.notifications
            .slice(0, 10)
            .map((n) => this._notifItemHTML(n))
            .join('')
        : '<p class="notif-empty">Sin notificaciones nuevas</p>';

      // Marcar como leídas después de abrir
      if (data.unread > 0) {
        fetch(`${API_BASE}/notifications/read`, {
          method: 'POST',
          credentials: 'include',
        })
          .then(() => this._setBadgeCount(0))
          .catch(() => {});
      }
    } catch {
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
      } catch {
        /* ignorar */
      }
    });
  }

  injectToDropdown(notif) {
    const list = document.getElementById('notif-list');
    if (!list) return;
    list.querySelector('.notif-empty')?.remove();
    list.insertAdjacentHTML('afterbegin', this._notifItemHTML(notif, true));
  }

  /* ════════════════════════════════
     TOAST VISUAL
  ════════════════════════════════ */
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

  /* ════════════════════════════════
     BADGE
  ════════════════════════════════ */
  updateBell(delta = 0) {
    const dot = document.getElementById('notif-dot');
    if (!dot) return;
    const current = parseInt(dot.textContent) || 0;
    const next = Math.max(0, current + delta);
    this._setBadgeCount(next);
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

  /* ════════════════════════════════
     HTML HELPERS
  ════════════════════════════════ */
  _notifItemHTML(n, isNew = false) {
    const unread = isNew || !n.is_read;
    return `
      <div class="notif-item ${unread ? 'notif-item-unread' : ''}" id="notif-box-${n.id}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <p class="notif-title" style="margin:0;font-size:13px;font-weight:500">
            ${this._esc(n.title)}
          </p>
          <button class="btn-delete-notif" data-id="${n.id}" title="Eliminar" type="button"
            style="background:none;border:none;color:var(--text-muted);cursor:pointer;
                   font-size:12px;padding:2px;flex-shrink:0">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <p style="font-size:12px;margin:4px 0 0;color:var(--text-muted)">
          ${this._esc(n.message || n.text || '')}
        </p>
        <p style="font-size:11px;margin-top:6px;color:var(--text-muted)">
          ${this._ftm(n.created_at)}
        </p>
      </div>`;
  }

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
