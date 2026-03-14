/**
 * assets/js/activitiesCoder.js
 * Página Actividades — vista Coder.
 * Lista actividades del TL (PDF/repo), descarga, notificaciones.
 */

import { guards, sessionManager } from '../../src/core/auth/session.js';
import { API_BASE } from '../../src/core/config.js';

const el = (id) => document.getElementById(id);

/* ── State ── */
let allAssignments = [];
let allResources = [];
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

  await loadActivities();

  // Sync: Refresh activities if a new assignment notification arrives
  window.addEventListener('kairo-notification', (e) => {
    if (e.detail.type === 'assignment') {
      console.log('[Sync] New assignment detected, refreshing grid...');
      loadActivities();
    }
  });
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
    const [aRes, rRes] = await Promise.all([
      fetch(`${API_BASE}/coder/assignments`, { credentials: 'include' }),
      fetch(`${API_BASE}/coder/resources`, { credentials: 'include' }),
    ]);

    const aData = await aRes.json();
    const rData = await rRes.json();

    if (!aRes.ok) throw new Error(aData.error || `HTTP ${aRes.status}`);

    allAssignments = aData.assignments || [];
    allResources = rRes.ok ? rData.resources || [] : [];

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

  const items = [
    ...allAssignments.map((a) => ({ ...a, _kind: 'assignment' })),
    ...allResources.map((r) => ({
      ...r,
      _kind: 'resource',
      content_type: 'resource',
      created_at: r.uploaded_at,
      scope: 'clan',
    })),
  ].sort(
    (a, b) =>
      new Date(b.created_at || b.uploaded_at) -
      new Date(a.created_at || a.uploaded_at)
  );

  const filtered = applyFilter(items);

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

  const total = items.length;
  el('act-count').textContent =
    `${allAssignments.length} actividad${allAssignments.length !== 1 ? 'es' : ''} · ` +
    `${allResources.length} recurso${allResources.length !== 1 ? 's' : ''} RAG`;

  el('act-grid').innerHTML = filtered.map(renderCard).join('');
}

function renderCard(a) {
  if (a._kind === 'resource') {
    const modName =
      a.module_name || (a.module_id ? `Módulo ${a.module_id}` : '');
    const tlName = a.tl_name || 'Tu Leader';
    const uploadDate = new Date(
      a.uploaded_at || a.created_at
    ).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    return `
      <div class="act-card type-resource">
        <div class="act-card-stripe"></div>
        <div class="act-card-body">
          <div class="act-card-header">
            <div class="act-type-icon"><i class="fa-solid fa-book-open"></i></div>
            <div class="act-card-info">
              <p class="act-card-title">${esc(a.title)}</p>
              <div class="act-chips">
                ${modName ? `<span class="act-chip module"><i class="fa-solid fa-layer-group"></i> ${esc(modName)}</span>` : ''}
                <span class="act-chip tl"><i class="fa-solid fa-user-tie"></i> ${esc(tlName)}</span>
                <span class="act-chip scope-all"><i class="fa-solid fa-brain"></i> RAG</span>
              </div>
            </div>
          </div>
          <div class="act-deadline resource-date">
             <i class="fa-regular fa-calendar-check"></i>
             Publicado el ${uploadDate}
          </div>
          ${
            a.preview_text
              ? `<div class="act-preview-text">${esc(a.preview_text.slice(0, 120))}…</div>`
              : ''
          }
        </div>
        <div class="act-card-footer">
          <button class="btn-act-primary" onclick="downloadResource(${a.id}, this)">
             <i class="fa-solid fa-download"></i> Descargar Recurso
          </button>
        </div>
      </div>`;
  }

  const typeClass = a.content_type === 'pdf' ? 'type-pdf' : 'type-repo';
  // ... rest of regular assignment rendering

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
   DOWNLOAD RESOURCE
   (Función separada para evitar confusiones de endpoint)
══════════════════════════════════════ */
async function downloadResource(id, btn) {
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

  try {
    const res = await fetch(`${API}/coder/resource/${id}/download`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo obtener recurso.');

    const link = document.createElement('a');
    link.href = data.url;
    link.download = data.fileName || 'recurso_rag.pdf';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Recurso descargado', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
}
window.downloadResource = downloadResource;

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

function applyFilter(items) {
  if (activeFilter === 'pending') {
    return items.filter((a) => {
      if (a._kind === 'resource') return true; // los recursos no vencen
      if (!a.deadline) return true;
      return new Date(a.deadline) >= new Date();
    });
  }
  if (activeFilter === 'overdue') {
    return items.filter((a) => {
      if (a._kind === 'resource') return false;
      if (!a.deadline) return false;
      return new Date(a.deadline) < new Date();
    });
  }
  return items;
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
  document
    .querySelectorAll('.btn-logout')
    .forEach((btn) =>
      btn.addEventListener('click', () => sessionManager.logout())
    );
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
