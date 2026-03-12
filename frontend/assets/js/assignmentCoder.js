/**
 * assets/js/activitiesCoder.js
 * Página Actividades — vista Coder.
 * Lista actividades del TL (PDF/repo), descarga, notificaciones.
 */

import { guards, sessionManager } from '/frontend/src/core/auth/session.js';

const API = 'http://localhost:3000/api';
const el = (id) => document.getElementById(id);

/* ── State ── */
let allAssignments = [];
let activeFilter = 'all';

/* ══════════════════════════════════════
   BOOTSTRAP
══════════════════════════════════════ */
(async function init() {
  applyTheme();
  wireThemeToggle();

  const session = await guards.requireAuth();
  if (!session) return;
  if (session.user.role !== 'coder') {
    sessionManager.redirectByRole(session.user);
    return;
  }

  // Set topbar name
  el('topbar-name').textContent =
    session.user.fullName || session.user.full_name || '—';

  wireLogout();
  setDate();
  wireFilters();
  wireNotifBell();

  await Promise.all([loadActivities(), loadNotifications()]);
})();

/* ══════════════════════════════════════
   LOAD ACTIVITIES
══════════════════════════════════════ */
async function loadActivities() {
  el('act-loading').style.display = 'grid';
  el('act-empty').classList.add('hidden');
  el('act-grid').classList.add('hidden');
  el('error-banner').classList.add('hidden');

  try {
    const res = await fetch(`${API}/coder/assignments`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

    allAssignments = data.assignments;
    renderActivities();
  } catch (err) {
    console.error('[loadActivities]', err);
    el('act-loading').style.display = 'none';
    el('error-banner').classList.remove('hidden');
    el('error-msg').textContent = err.message;
  }
}

function renderActivities() {
  el('act-loading').style.display = 'none';

  const filtered = applyFilter(allAssignments);

  if (!filtered.length) {
    el('act-grid').classList.add('hidden');
    el('act-empty').classList.remove('hidden');
    el('act-count').textContent =
      activeFilter === 'all'
        ? 'Sin actividades publicadas aún'
        : 'Sin actividades con este filtro';
    return;
  }

  el('act-empty').classList.add('hidden');
  el('act-grid').classList.remove('hidden');

  const total = allAssignments.length;
  el('act-count').textContent =
    `${total} actividad${total !== 1 ? 'es' : ''} publicada${total !== 1 ? 's' : ''}`;

  el('act-grid').innerHTML = filtered.map(renderCard).join('');
}

function renderCard(a) {
  const typeClass = a.content_type === 'pdf' ? 'type-pdf' : 'type-repo';

  const typeIcon =
    a.content_type === 'pdf'
      ? '<i class="fa-solid fa-file-pdf"></i>'
      : `<svg viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg" style="width:18px;height:18px;color:var(--accent)">
           <path fill-rule="evenodd" clip-rule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" fill="currentColor"/>
         </svg>`;

  const moduleChip = a.module_name
    ? `<span class="act-chip module">${esc(a.module_name)}</span>`
    : '';
  const tlChip = a.tl_name
    ? `<span class="act-chip tl"><i class="fa-solid fa-user-tie"></i> ${esc(a.tl_name)}</span>`
    : '';
  const scopeChip =
    a.scope === 'all'
      ? `<span class="act-chip scope-all"><i class="fa-solid fa-earth-americas"></i> Todos los coders</span>`
      : '';

  const deadlineBadge = buildDeadlineBadge(a.deadline);
  const deadlineClass = getDeadlineClass(a.deadline);

  // Action buttons
  let actions = '';
  if (a.content_type === 'pdf') {
    actions = `
      <button class="btn-act-primary" onclick="downloadAssignment(${a.id}, this)">
        <i class="fa-solid fa-download"></i> Descargar PDF
      </button>`;
  } else if (a.content_type === 'repo' && a.repo_url) {
    actions = `
      <a href="${esc(a.repo_url)}" target="_blank" rel="noopener" class="btn-act-primary" style="text-decoration:none">
        <i class="fa-brands fa-github"></i> Ver repositorio
      </a>`;
  }

  return `
    <div class="act-card ${typeClass}" data-deadline-class="${deadlineClass}">
      <div class="act-card-stripe"></div>
      <div class="act-card-body">
        <div class="act-card-header">
          <div class="act-type-icon">${typeIcon}</div>
          <div class="act-card-info">
            <p class="act-card-title">${esc(a.title)}</p>
            <div class="act-chips">
              ${moduleChip}${tlChip}${scopeChip}
            </div>
          </div>
        </div>
        <div class="act-deadline ${deadlineClass}">
          <i class="fa-regular fa-calendar"></i>
          ${deadlineBadge}
        </div>
      </div>
      <div class="act-card-footer">
        ${actions}
      </div>
    </div>`;
}

/* ══════════════════════════════════════
   DOWNLOAD PDF
══════════════════════════════════════ */
async function downloadAssignment(id, btn) {
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i> Generando enlace...';

  try {
    const res = await fetch(`${API}/coder/assignment/${id}/download`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al obtener el enlace.');

    // Trigger download
    const link = document.createElement('a');
    link.href = data.url;
    link.download = data.fileName || 'actividad.pdf';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Descarga iniciada', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
}
window.downloadAssignment = downloadAssignment;

/* ══════════════════════════════════════
   FILTERS
══════════════════════════════════════ */
function wireFilters() {
  el('act-filter-row').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    activeFilter = chip.dataset.filter;
    el('act-filter-row')
      .querySelectorAll('.chip')
      .forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    renderActivities();
  });
}

function applyFilter(assignments) {
  if (activeFilter === 'pending') {
    return assignments.filter((a) => {
      if (!a.deadline) return true;
      return new Date(a.deadline) >= new Date();
    });
  }
  if (activeFilter === 'overdue') {
    return assignments.filter((a) => {
      if (!a.deadline) return false;
      return new Date(a.deadline) < new Date();
    });
  }
  return assignments;
}

/* ══════════════════════════════════════
   NOTIFICATIONS
══════════════════════════════════════ */
async function loadNotifications() {
  try {
    const res = await fetch(`${API}/notifications`, { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();

    if (data.unread > 0) {
      el('notif-dot').classList.remove('hidden');
      el('notif-dot').textContent = data.unread > 9 ? '9+' : data.unread;
    }

    if (data.notifications.length) {
      el('notif-list').innerHTML = data.notifications
        .slice(0, 10)
        .map(
          (n) => `
          <div class="notif-item ${!n.is_read ? 'notif-item-unread' : ''}">
            <p class="notif-title">${esc(n.title)}</p>
            <p class="notif-time">${relativeTime(n.created_at)}</p>
          </div>`
        )
        .join('');
    }
  } catch {
    /* non-critical */
  }
}

function wireNotifBell() {
  const btn = el('btn-notif');
  const dropdown = el('notif-dropdown');

  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');

    if (!dropdown.classList.contains('hidden')) {
      // Mark as read
      try {
        await fetch(`${API}/notifications/read`, {
          method: 'POST',
          credentials: 'include',
        });
        el('notif-dot').classList.add('hidden');
      } catch {
        /* non-critical */
      }
    }
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && e.target !== btn) {
      dropdown.classList.add('hidden');
    }
  });
}

/* ══════════════════════════════════════
   TOAST
══════════════════════════════════════ */
let _toastTimer = null;

function showToast(msg, type = 'success') {
  const toast = el('toast');
  toast.className = `toast-coder ${type}`;
  el('toast-icon').className = `fa-solid ${
    type === 'success'
      ? 'fa-circle-check'
      : type === 'error'
        ? 'fa-circle-xmark'
        : 'fa-circle-info'
  }`;
  el('toast-msg').textContent = msg;
  toast.classList.remove('hidden');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toast.classList.add('hidden'), 3500);
}

/* ══════════════════════════════════════
   HELPERS
══════════════════════════════════════ */
function buildDeadlineBadge(deadline) {
  if (!deadline) return 'Sin fecha límite';
  const d = new Date(deadline);
  const diffDays = Math.round((d - new Date()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)
    return `Venció hace ${Math.abs(diffDays)} día${Math.abs(diffDays) !== 1 ? 's' : ''}`;
  if (diffDays === 0) return 'Vence hoy';
  if (diffDays <= 3)
    return `Vence en ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
  return `Vence el ${d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}`;
}

function getDeadlineClass(deadline) {
  if (!deadline) return 'no-date';
  const diffDays = Math.round(
    (new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 3) return 'soon';
  return 'ok';
}

function relativeTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'Hace un momento';
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `Hace ${days}d`;
}

function esc(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function setDate() {
  el('topbar-date').textContent = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function wireLogout() {
  el('btn-logout').addEventListener('click', () => sessionManager.logout());
}

function applyTheme() {
  const stored = localStorage.getItem('kairo_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', stored);
  syncThemeIcon(stored);
}

function wireThemeToggle() {
  el('btn-theme').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('kairo_theme', next);
    syncThemeIcon(next);
  });
}

function syncThemeIcon(theme) {
  el('icon-moon').style.display = theme === 'dark' ? 'block' : 'none';
  el('icon-sun').style.display = theme === 'light' ? 'block' : 'none';
}

window.loadActivities = loadActivities;
