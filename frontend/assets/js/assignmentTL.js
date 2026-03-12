/**
 * assets/js/activitiesTL.js
 * Página de Actividades — vista TL.
 * Gestiona: crear trabajos (PDF/repo), listar, eliminar,
 * subir recursos RAG, notificaciones automáticas.
 */

import { guards, sessionManager } from '/frontend/src/core/auth/session.js';

const API = 'http://localhost:3000/api';
const el = (id) => document.getElementById(id);

/* ── State ── */
let assignments = [];
let currentScope = 'clan';
let currentContentType = 'pdf';
let selectedFile = null;
let tlClan = '—';

/* ══════════════════════════════════════
   BOOTSTRAP
══════════════════════════════════════ */
(async function init() {
  applyTheme();
  wireThemeToggle();

  const session = await guards.requireAuth();
  if (!session) return;
  if (session.user.role !== 'tl') {
    sessionManager.redirectByRole(session.user);
    return;
  }

  wireLogout();
  setDate();
  wireAddModal();
  wireRagModal();

  await loadAssignments();
})();

/* ══════════════════════════════════════
   LOAD & RENDER
══════════════════════════════════════ */
async function loadAssignments() {
  el('assignments-loading').style.display = 'grid';
  el('assignments-empty').classList.add('hidden');
  el('assignments-grid').classList.add('hidden');
  el('error-banner').classList.add('hidden');

  try {
    const res = await fetch(`${API}/tl/assignments`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

    // Set clan name in heading
    if (data.assignments.length > 0) {
      // Get clan from session indirectly via first assignment's clan_id
    }

    // Try to get TL info for clan heading
    try {
      const tlRes = await fetch(`${API}/tl/dashboard`, {
        credentials: 'include',
      });
      if (tlRes.ok) {
        const tlData = await tlRes.json();
        tlClan = tlData.tl?.clan || '—';
        el('clan-heading').textContent = cap(tlClan);
        el('scope-clan-label').textContent = `Coders del clan ${cap(tlClan)}`;
      }
    } catch {
      /* non-critical */
    }

    assignments = data.assignments;
    renderAssignments();
  } catch (err) {
    console.error('[loadAssignments]', err);
    el('assignments-loading').style.display = 'none';
    el('error-banner').classList.remove('hidden');
    el('error-msg').textContent = err.message;
  }
}

function renderAssignments() {
  el('assignments-loading').style.display = 'none';

  if (!assignments.length) {
    el('assignments-empty').classList.remove('hidden');
    el('assignment-count').textContent = 'Sin actividades publicadas aún';
    return;
  }

  const plural =
    assignments.length === 1
      ? '1 actividad publicada'
      : `${assignments.length} actividades publicadas`;
  el('assignment-count').textContent = plural;

  el('assignments-grid').classList.remove('hidden');
  el('assignments-grid').innerHTML = assignments.map(renderCard).join('');

  // Wire three-dot menus
  el('assignments-grid')
    .querySelectorAll('[data-menu-id]')
    .forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menuId = btn.dataset.menuId;
        const dropdown = el(`dropdown-${menuId}`);
        // Close all others
        document.querySelectorAll('.three-dot-dropdown').forEach((d) => {
          if (d.id !== `dropdown-${menuId}`) d.classList.add('hidden');
        });
        dropdown.classList.toggle('hidden');
      });
    });

  // Close menus on outside click
  document.addEventListener('click', () => {
    document
      .querySelectorAll('.three-dot-dropdown')
      .forEach((d) => d.classList.add('hidden'));
  });
}

function renderCard(a) {
  const typeClass = a.content_type === 'pdf' ? 'type-pdf' : 'type-repo';
  const typeIcon =
    a.content_type === 'pdf'
      ? '<i class="fa-solid fa-file-pdf"></i>'
      : '<i class="fa-brands fa-github"></i>';

  const scopeLabel =
    a.scope === 'all' ? 'Todos los coders' : `Clan ${cap(a.clan_id || '—')}`;
  const scopeClass = a.scope === 'all' ? 'all' : 'clan';

  const deadlineChip = a.deadline ? buildDeadlineChip(a.deadline) : '';
  const moduleChip = a.module_name
    ? `<span class="chip-module">${a.module_name}</span>`
    : '';
  const scopeChip = `<span class="chip-scope ${scopeClass}"><i class="fa-solid fa-${a.scope === 'all' ? 'earth-americas' : 'users'}"></i> ${scopeLabel}</span>`;

  const timeAgo = relativeTime(a.created_at);

  return `
    <div class="assignment-card ${typeClass}">
      <div class="card-top-row">
        <div class="card-type-icon">${typeIcon}</div>
        <div class="card-main">
          <p class="card-title-text" title="${esc(a.title)}">${esc(a.title)}</p>
          <div class="card-chips">
            ${moduleChip}
            ${scopeChip}
            ${deadlineChip}
          </div>
        </div>
        <div class="three-dot-wrapper">
          <button class="btn-three-dot" data-menu-id="${a.id}" title="Opciones">
            <i class="fa-solid fa-ellipsis-vertical"></i>
          </button>
          <div class="three-dot-dropdown hidden" id="dropdown-${a.id}">
            <button class="dropdown-item" onclick="deleteAssignment(${a.id})">
              <i class="fa-solid fa-trash"></i> Eliminar
            </button>
          </div>
        </div>
      </div>
      <div class="card-meta-row">
        <span><i class="fa-regular fa-clock" style="margin-right:5px"></i>${timeAgo}</span>
        ${
          a.content_type === 'repo' && a.repo_url
            ? `<a href="${esc(a.repo_url)}" target="_blank" rel="noopener"
               style="font-size:11.5px;color:var(--accent);text-decoration:none">
               <i class="fa-solid fa-arrow-up-right-from-square"></i> Ver repo
             </a>`
            : a.file_name
              ? `<span style="font-size:11px;color:var(--text-muted)">${esc(a.file_name)}</span>`
              : ''
        }
      </div>
    </div>`;
}

/* ══════════════════════════════════════
   ADD MODAL
══════════════════════════════════════ */
function wireAddModal() {
  el('btn-open-add').addEventListener('click', openAddModal);
  el('btn-close-add').addEventListener('click', closeAddModal);
  el('btn-do-add').addEventListener('click', submitAssignment);

  // File input
  el('a-file-input').addEventListener('change', () => {
    selectedFile = el('a-file-input').files[0] || null;
    updateDropZone();
  });

  // Drag & drop
  const dz = el('a-drop-zone');
  dz.addEventListener('dragover', (e) => {
    e.preventDefault();
    dz.classList.add('dragover');
  });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', (e) => {
    e.preventDefault();
    dz.classList.remove('dragover');
    selectedFile = e.dataTransfer.files[0] || null;
    updateDropZone();
  });

  // Repo URL detect
  el('a-repo-url').addEventListener('input', detectGithubUrl);

  // Close on overlay click
  el('add-modal').addEventListener('click', (e) => {
    if (e.target === el('add-modal')) closeAddModal();
  });
}

function openAddModal() {
  el('add-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  setStatus('a-status', '', '');
}

function closeAddModal() {
  el('add-modal').classList.add('hidden');
  document.body.style.overflow = '';
  resetAddModal();
}

function resetAddModal() {
  el('a-title').value = '';
  el('a-deadline').value = '';
  el('a-repo-url').value = '';
  el('github-preview').classList.add('hidden');
  selectedFile = null;
  updateDropZone();
  setStatus('a-status', '', '');
  setScope('clan');
  setContentType('pdf');
}

function setScope(s) {
  currentScope = s;
  el('scope-clan').classList.toggle('active', s === 'clan');
  el('scope-all').classList.toggle('active', s === 'all');
}
window.setScope = setScope;

function setContentType(t) {
  currentContentType = t;
  el('type-pdf').classList.toggle('active', t === 'pdf');
  el('type-repo').classList.toggle('active', t === 'repo');
  el('pdf-section').classList.toggle('hidden', t !== 'pdf');
  el('repo-section').classList.toggle('hidden', t !== 'repo');
}
window.setContentType = setContentType;

function updateDropZone() {
  const dz = el('a-drop-zone');
  const content = el('a-drop-content');
  if (selectedFile) {
    dz.classList.add('has-file');
    content.innerHTML = `
      <i class="fa-solid fa-file-pdf" style="font-size:24px;color:#10b981;margin-bottom:6px"></i>
      <p style="font-size:13px;font-weight:700;color:var(--text-main);margin:0">${esc(selectedFile.name)}</p>
      <p style="font-size:11px;color:var(--text-muted);margin:3px 0 0">
        ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB · Click para cambiar
      </p>`;
  } else {
    dz.classList.remove('has-file');
    content.innerHTML = `
      <i class="fa-solid fa-file-pdf" style="font-size:28px;color:#ef4444;margin-bottom:8px"></i>
      <p style="font-size:13px;font-weight:600;color:var(--text-main);margin:0">Haz clic o arrastra el PDF aquí</p>
      <p style="font-size:11px;color:var(--text-muted);margin:4px 0 0">Máximo 20 MB · Solo PDF</p>`;
  }
}

function detectGithubUrl() {
  const url = el('a-repo-url').value.trim();
  const preview = el('github-preview');
  if (url.includes('github.com') && url.startsWith('http')) {
    preview.classList.remove('hidden');
    el('github-preview-url').textContent = url
      .replace('https://', '')
      .replace('http://', '');
  } else {
    preview.classList.add('hidden');
  }
}

async function submitAssignment() {
  const title = el('a-title').value.trim();
  const moduleId = el('a-module').value;
  const deadline = el('a-deadline').value;
  const repoUrl = el('a-repo-url').value.trim();
  const btn = el('btn-do-add');

  if (!title) return setStatus('a-status', 'error', 'El título es requerido.');
  if (currentContentType === 'pdf' && !selectedFile)
    return setStatus('a-status', 'error', 'Selecciona un archivo PDF.');
  if (currentContentType === 'pdf' && selectedFile.type !== 'application/pdf')
    return setStatus('a-status', 'error', 'Solo se aceptan archivos PDF.');
  if (currentContentType === 'pdf' && selectedFile.size > 20 * 1024 * 1024)
    return setStatus('a-status', 'error', 'El archivo supera los 20 MB.');
  if (currentContentType === 'repo' && !repoUrl)
    return setStatus('a-status', 'error', 'Ingresa la URL del repositorio.');

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publicando...';
  setStatus('a-status', 'info', 'Subiendo y notificando coders...');

  try {
    const form = new FormData();
    form.append('title', title);
    form.append('moduleId', moduleId);
    form.append('scope', currentScope);
    form.append('contentType', currentContentType);
    if (deadline) form.append('deadline', deadline);
    if (currentContentType === 'pdf') form.append('file', selectedFile);
    if (currentContentType === 'repo') form.append('repoUrl', repoUrl);

    const res = await fetch(`${API}/tl/assignment`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Error al publicar.');

    const notified = data.notified || 0;
    showToast(
      `✓ Actividad publicada · ${notified} coder${notified !== 1 ? 's' : ''} notificado${notified !== 1 ? 's' : ''}`,
      'success'
    );
    closeAddModal();
    await loadAssignments();
  } catch (err) {
    setStatus('a-status', 'error', err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML =
      '<i class="fa-solid fa-paper-plane"></i> Publicar actividad';
  }
}

async function deleteAssignment(id) {
  if (!confirm('¿Eliminar esta actividad? Los coders ya no podrán verla.'))
    return;

  try {
    const res = await fetch(`${API}/tl/assignment/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Error al eliminar.');

    showToast('Actividad eliminada', 'info');
    assignments = assignments.filter((a) => a.id !== id);
    renderAssignments();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
window.deleteAssignment = deleteAssignment;

/* ══════════════════════════════════════
   RAG UPLOAD MODAL (moved from dashboardTL)
══════════════════════════════════════ */
let _ragFile = null;

function wireRagModal() {
  el('btn-open-rag').addEventListener('click', openUploadModal);

  const fi = el('upload-file-input');
  const dz = el('drop-zone');

  fi.addEventListener('change', () => {
    _ragFile = fi.files[0] || null;
    _updateRagDropZone();
  });

  dz.addEventListener('dragover', (e) => {
    e.preventDefault();
    dz.classList.add('dragover');
  });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', (e) => {
    e.preventDefault();
    dz.classList.remove('dragover');
    _ragFile = e.dataTransfer.files[0] || null;
    _updateRagDropZone();
  });

  el('upload-resource-modal').addEventListener('click', (e) => {
    if (e.target === el('upload-resource-modal')) closeUploadModal();
  });
}

function _updateRagDropZone() {
  const content = el('drop-zone-content');
  if (!content) return;
  if (_ragFile) {
    el('drop-zone').classList.add('has-file');
    content.innerHTML = `
      <i class="fa-solid fa-file-pdf" style="font-size:24px;color:#10b981;margin-bottom:6px"></i>
      <p style="font-size:13px;font-weight:700;color:var(--text-main);margin:0">${esc(_ragFile.name)}</p>
      <p style="font-size:11px;color:var(--text-muted);margin:3px 0 0">
        ${(_ragFile.size / 1024 / 1024).toFixed(2)} MB · Click para cambiar
      </p>`;
  } else {
    el('drop-zone').classList.remove('has-file');
    content.innerHTML = `
      <i class="fa-solid fa-file-pdf" style="font-size:28px;color:#ef4444;margin-bottom:8px"></i>
      <p style="font-size:13px;font-weight:600;color:var(--text-main);margin:0">Haz clic o arrastra el PDF aquí</p>
      <p style="font-size:11px;color:var(--text-muted);margin:4px 0 0">Máximo 20 MB · Solo PDF</p>`;
  }
}

window.openUploadModal = function () {
  el('upload-resource-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  setStatus('upload-status', '', '');
  el('upload-progress').classList.add('hidden');
};

window.closeUploadModal = function () {
  el('upload-resource-modal').classList.add('hidden');
  document.body.style.overflow = '';
  _ragFile = null;
  _updateRagDropZone();
  el('upload-title').value = '';
};

window.doUpload = async function () {
  const title = el('upload-title').value.trim();
  const moduleId = el('upload-module').value;
  const btn = el('btn-do-upload');

  if (!title)
    return setStatus('upload-status', 'error', 'El título es requerido.');
  if (!_ragFile)
    return setStatus('upload-status', 'error', 'Selecciona un archivo PDF.');
  if (_ragFile.type !== 'application/pdf')
    return setStatus('upload-status', 'error', 'Solo se aceptan PDFs.');
  if (_ragFile.size > 20 * 1024 * 1024)
    return setStatus('upload-status', 'error', 'El archivo supera los 20 MB.');

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Subiendo...';
  setStatus('upload-status', 'info', 'Subiendo archivo...');

  const prog = el('upload-progress');
  const bar = el('upload-progress-bar');
  prog.classList.remove('hidden');
  bar.style.width = '30%';

  try {
    const form = new FormData();
    form.append('file', _ragFile);
    form.append('title', title);
    form.append('moduleId', moduleId);

    const res = await fetch(`${API}/tl/resource/upload`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    const data = await res.json();
    bar.style.width = '100%';

    if (res.ok && data.success) {
      setStatus(
        'upload-status',
        'success',
        '✓ PDF subido. El embedding se procesa en segundo plano (~10s).'
      );
      showToast('Recurso RAG subido correctamente', 'success');
      setTimeout(window.closeUploadModal, 2500);
    } else {
      setStatus(
        'upload-status',
        'error',
        data.error || 'Error al subir el archivo.'
      );
    }
  } catch {
    setStatus('upload-status', 'error', 'No se pudo conectar con el servidor.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-upload"></i> Subir PDF';
  }
};

/* ══════════════════════════════════════
   TOAST
══════════════════════════════════════ */
let _toastTimer = null;

function showToast(msg, type = 'success') {
  const toast = el('toast');
  const icon = el('toast-icon');

  toast.className = `toast ${type}`;
  icon.className = `toast-icon fa-solid ${
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
function setStatus(elId, type, msg) {
  const statusEl = el(elId);
  if (!msg) {
    statusEl.classList.add('hidden');
    return;
  }
  statusEl.className = `upload-status ${type}`;
  statusEl.textContent = msg;
  statusEl.classList.remove('hidden');
}

function buildDeadlineChip(deadline) {
  const d = new Date(deadline);
  const now = new Date();
  const diffDays = Math.round((d - now) / (1000 * 60 * 60 * 24));
  let cls, text;

  if (diffDays < 0) {
    cls = 'overdue';
    text = `Venció hace ${Math.abs(diffDays)}d`;
  } else if (diffDays <= 3) {
    cls = 'soon';
    text = diffDays === 0 ? 'Vence hoy' : `Vence en ${diffDays}d`;
  } else {
    cls = 'ok';
    text = `${d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}`;
  }

  return `<span class="chip-deadline ${cls}"><i class="fa-regular fa-calendar"></i> ${text}</span>`;
}

function relativeTime(isoString) {
  const d = new Date(isoString);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'Hace un momento';
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs} hora${hrs > 1 ? 's' : ''}`;
  const days = Math.floor(hrs / 24);
  return `Hace ${days} día${days > 1 ? 's' : ''}`;
}

function cap(str) {
  if (!str) return '—';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
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

// Expose for retry button
window.loadAssignments = loadAssignments;
