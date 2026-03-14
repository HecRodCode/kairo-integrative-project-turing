/**
 * src/core/notificationsSSE.js
 */

import { API_BASE } from './config.js';

class NotificationService {
  constructor() {
    this.eventSource = null;
    this.isConnected = false;
    this._everConnected = false;
    this._retryDelay = 5000;
    this.userRole = null;
    this.toastTimer = null;
    this._pendingToast = null;
  }

  connect(userRole) {
    if (this.isConnected) return;
    this.userRole = userRole;

    this.eventSource = new EventSource(`${API_BASE}/notifications/stream`, {
      withCredentials: true,
    });

    this.eventSource.onopen = () => {
      console.log('[SSE] Connected to Kairo Realtime Notifications.');
      this.isConnected = true;
      this._everConnected = true;
      this._retryDelay = 5000;
    };

    this.eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'NEW_NOTIFICATION') {
          this.showVisualToast(payload.data);
          this.updateBell();
          this.injectToDropdown(payload.data);
          window.dispatchEvent(
            new CustomEvent('kairo-notification', { detail: payload.data })
          );
        }
      } catch (err) {
        console.error('[SSE] Error parsing notification:', err);
      }
    };

    this.eventSource.onerror = () => {
      this.isConnected = false;
      this.eventSource.close();

      if (!this._everConnected) {
        console.warn(
          '[SSE] Stream no disponible — notificaciones en tiempo real deshabilitadas.'
        );
        return;
      }

      this._retryDelay = Math.min(this._retryDelay * 2, 60000);
      console.warn(`[SSE] Reconectando en ${this._retryDelay / 1000}s...`);
      setTimeout(() => this.connect(userRole), this._retryDelay);
    };

    // Defer DOM wiring until page is fully parsed
    this._whenDOMReady(() => {
      this._wireToast();
      this._wireBellDropdown();
      this._wireDeleteHandler();
    });
  }

  _whenDOMReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  //  DOM WIRING
  _wireToast() {
    if (document.getElementById('toast')) return;
    const cls =
      this.userRole === 'coder' ? 'toast-coder hidden' : 'toast hidden';
    const div = document.createElement('div');
    div.className = cls;
    div.id = 'toast';
    div.innerHTML = `
      <i class="fa-solid fa-circle-check" id="toast-icon"></i>
      <span id="toast-msg">—</span>
    `;
    document.body.appendChild(div);
  }

  _wireBellDropdown() {
    const btn = document.getElementById('btn-notif');
    const dropdown = document.getElementById('notif-dropdown');
    const list = document.getElementById('notif-list');

    if (!btn || !dropdown || !list) {
      console.warn(
        '[SSE] Notification bell elements not found in DOM. Skipping wire-up.'
      );
      return;
    }
    if (btn.dataset.ssebound) return;
    btn.dataset.ssebound = 'true';

    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
      if (dropdown.classList.contains('hidden')) return;

      try {
        const res = await fetch(`${API_BASE}/notifications`, {
          credentials: 'include',
        });
        if (!res.ok) return;
        const data = await res.json();

        const dot = document.getElementById('notif-dot');
        if (dot) {
          if (data.unread > 0) {
            dot.classList.remove('hidden');
            dot.textContent = data.unread > 9 ? '9+' : data.unread;
          } else {
            dot.classList.add('hidden');
            dot.textContent = '';
          }
        }

        list.innerHTML = data.notifications?.length
          ? data.notifications
              .slice(0, 10)
              .map(
                (n) => `
              <div class="notif-item ${!n.is_read ? 'notif-item-unread' : ''}" id="notif-box-${n.id}">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                  <p class="notif-title" style="margin:0">${this._esc(n.title)}</p>
                  <button class="btn-delete-notif" data-id="${n.id}" title="Eliminar"
                    style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:12px;padding:2px;">
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                </div>
                <p class="notif-text" style="font-size:12px;margin:4px 0 0;">${this._esc(n.message || n.text || '')}</p>
                <p class="notif-time" style="margin-top:4px;">${this._ftm(n.created_at)}</p>
              </div>`
              )
              .join('')
          : '<p class="notif-empty">Sin notificaciones nuevas</p>';

        fetch(`${API_BASE}/notifications/read`, {
          method: 'POST',
          credentials: 'include',
        }).catch(() => {});
      } catch (err) {
        console.error('[SSE] Error fetching notifications:', err);
      }
    });

    document.addEventListener('click', (e) => {
      if (
        !dropdown.classList.contains('hidden') &&
        !dropdown.contains(e.target) &&
        !btn.contains(e.target)
      ) {
        dropdown.classList.add('hidden');
      }
    });
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
        console.error('[SSE] Error deleting notification:', err);
      }
    });
  }

  //  LIVE SSE HANDLERS
  injectToDropdown(notif) {
    const list = document.getElementById('notif-list');
    if (!list) return;
    list.querySelector('.notif-empty')?.remove();
    list.insertAdjacentHTML(
      'afterbegin',
      `
      <div class="notif-item notif-item-unread" id="notif-box-${notif.id}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <p class="notif-title" style="margin:0">${this._esc(notif.title)}</p>
          <button class="btn-delete-notif" data-id="${notif.id}" title="Eliminar"
            style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:12px;padding:2px;">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <p class="notif-text" style="font-size:12px;margin:4px 0 0;">${this._esc(notif.message || notif.text || '')}</p>
        <p class="notif-time">Ahora mismo</p>
      </div>`
    );
  }

  showVisualToast(notification) {
    const icons = {
      feedback: 'fa-comment-dots',
      assignment: 'fa-clipboard-list',
      feedback_read: 'fa-envelope-open-text',
    };
    const types = {
      feedback: 'warning',
      assignment: 'success',
      feedback_read: 'info',
    };
    const icon = icons[notification.type] || 'fa-bell';
    const typeClass = types[notification.type] || 'info';

    const toastEl = document.getElementById('toast');
    const toastIcon = document.getElementById('toast-icon');
    const toastMsg = document.getElementById('toast-msg');

    if (toastEl && toastIcon && toastMsg) {
      toastIcon.className = `fa-solid ${icon}`;
      toastMsg.textContent = notification.title;
      toastEl.classList.remove('hidden', 'success', 'warning', 'error', 'info');
      toastEl.classList.add(typeClass);
      if (this.toastTimer) clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => toastEl.classList.add('hidden'), 4500);
    }
  }

  updateBell() {
    const dot = document.getElementById('notif-dot');
    if (!dot) return;
    dot.classList.remove('hidden');
    const current = parseInt(dot.textContent) || 0;
    const next = current + 1;
    dot.textContent = next > 9 ? '9+' : next.toString();
  }

  disconnect() {
    this.eventSource?.close();
    this.isConnected = false;
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
