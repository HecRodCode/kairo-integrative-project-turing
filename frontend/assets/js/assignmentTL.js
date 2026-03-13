/**
 * assets/js/activitiesTL.js
 * Página Actividades — vista TL.
 * Grid combinado: actividades (PDF/repo) + recursos RAG.
 */

import { guards, sessionManager } from '../../src/core/auth/session.js';

const API = 'http://localhost:3000/api';
const el = (id) => document.getElementById(id);

/* ── State ── */
let assignments = [];
let resources = [];
let currentScope = 'clan';
let currentType = 'pdf';
let selectedFile = null;
let _ragFile = null;
let _toastTimer = null;

/* ══════════════════════════════════════
   BOOTSTRAP
══════════════════════════════════════ */
(async function init() {
  try {
    const session = await guards.requireAuth();
    if (!session) return;
    if (session.user.role !== 'tl') {
      sessionManager.redirectByRole(session.user);
      return;
    }

    el('topbar-name').textContent =
      session.user.fullName || session.user.full_name || '—';
  } catch (e) {
    console.error('[init] auth error:', e);
    return;
  }

  // Wire UI before any fetches — buttons must work even if backend is slow
  
  wireLogout();
  setDate();
  wireAddModal();
  wireRagModal();
  el('btn-retry').addEventListener('click', loadAll);

  await loadAll();
})();

/* ══════════════════════════════════════
   LOAD — assignments + resources (independent fetches)
══════════════════════════════════════ */
async function loadAll() {
  el('assignments-loading').style.display = 'grid';
  el('assignments-empty').classList.add('hidden');
  el('assignments-grid').classList.add('hidden');
  el('grid-legend').classList.add('hidden');
  el('error-banner').classList.add('hidden');

  // Non-fatal: enrich clan label
  try {
    const tlRes = await fetch(`${API}/tl/dashboard`, {
      credentials: 'include',
    });
    if (tlRes.ok) {
      const d = await tlRes.json();
      const clan = d.tl?.clan || '';
      if (clan) {
        el('clan-heading').textContent = cap(clan);
        el('scope-clan-label').textContent = `Coders del clan ${cap(clan)}`;
      }
    }
  } catch {
    /* non-critical */
  }

  // Fetch assignments
  try {
    const res = await fetch(`${API}/tl/assignments`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    assignments = data.assignments || [];
  } catch (err) {
    console.error('[loadAll] assignments:', err);
    el('assignments-loading').style.display = 'none';
    el('error-banner').classList.remove('hidden');
    el('error-msg').textContent =
      `No se pudo conectar al servidor (${err.message})`;
    return;
  }

  // Fetch resources (non-fatal — show assignments even if resources fail)
  try {
    const res = await fetch(`${API}/tl/resource/list`, {
      credentials: 'include',
    });
    const data = await res.json();
    resources = res.ok ? data.resources || [] : [];
  } catch {
    resources = [];
  }

  renderGrid();
}

/* ══════════════════════════════════════
   RENDER GRID (assignments + resources mezclados)
══════════════════════════════════════ */
function renderGrid() {
  el('assignments-loading').style.display = 'none';

  const items = [
    ...assignments.map((a) => ({ ...a, _kind: 'assignment' })),
    ...resources.map((r) => ({
      ...r,
      _kind: 'resource',
      content_type: 'resource',
      created_at: r.uploaded_at,
      scope: 'clan',
    })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (!items.length) {
    el('assignments-empty').classList.remove('hidden');
    el('assignment-count').textContent = 'Sin contenido publicado aún';
    return;
  }

  el('assignment-count').textContent =
    `${assignments.length} actividad${assignments.length !== 1 ? 'es' : ''} · ` +
    `${resources.length} recurso${resources.length !== 1 ? 's' : ''} RAG`;

  el('assignments-grid').innerHTML = items.map(renderCard).join('');
  el('assignments-grid').classList.remove('hidden');
  el('grid-legend').classList.remove('hidden');

  // Three-dot menus
  el('assignments-grid')
    .querySelectorAll('[data-menu-id]')
    .forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menuId = btn.dataset.menuId;
        document.querySelectorAll('.three-dot-dropdown').forEach((d) => {
          d.classList.toggle('hidden', d.id !== `dropdown-${menuId}`);
        });
      });
    });

  // Delete buttons
  el('assignments-grid')
    .querySelectorAll('.btn-delete-item')
    .forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const { id, kind } = btn.dataset;
        if (kind === 'assignment') deleteAssignment(id);
        else deleteResource(id);
      });
    });

  // Close dropdowns on outside click
  document.addEventListener('click', () => {
    document
      .querySelectorAll('.three-dot-dropdown')
      .forEach((d) => d.classList.add('hidden'));
  });
}

function renderCard(item) {
  if (item._kind === 'resource') {
    const modName = item.module_id ? `Módulo ${item.module_id}` : '';
    return `
      <div class="assignment-card type-resource">
        <div class="card-top-row">
          <div class="card-type-icon"><i class="fa-solid fa-book-open"></i></div>
          <div class="card-main">
            <p class="card-title-text" title="${esc(item.title)}">${esc(item.title)}</p>
            <div class="card-chips">
              ${modName ? `<span class="chip-module">${modName}</span>` : ''}
              <span class="chip-scope clan chip-rag">
                <i class="fa-solid fa-brain-circuit"></i> Recurso RAG
              </span>
            </div>
            ${
              item.preview_text
                ? `<p class="card-preview">${esc(item.preview_text.slice(0, 100))}…</p>`
                : ''
            }
          </div>
          <div class="three-dot-wrapper">
            <button class="btn-three-dot" data-menu-id="r-${item.id}" title="Opciones">
              <i class="fa-solid fa-ellipsis-vertical"></i>
            </button>
            <div class="three-dot-dropdown hidden" id="dropdown-r-${item.id}">
              <button class="dropdown-item btn-delete-item" data-id="${item.id}" data-kind="resource">
                <i class="fa-solid fa-trash"></i> Eliminar
              </button>
            </div>
          </div>
        </div>
        <div class="card-meta-row">
          <span><i class="fa-regular fa-clock" style="margin-right:5px"></i>${relativeTime(item.created_at)}</span>
          <span style="font-size:11px;color:var(--text-muted)">${esc(item.file_name || '')}</span>
        </div>
      </div>`;
  }

  // Assignment card (pdf / repo)
  const typeClass = item.content_type === 'pdf' ? 'type-pdf' : 'type-repo';
  const typeIcon =
    item.content_type === 'pdf'
      ? '<i class="fa-solid fa-file-pdf"></i>'
      : '<i class="fa-brands fa-github"></i>';
    item.scope === 'all'
      ? 'Todos los coders'
      : `Clan ${cap(item.clan || '—')}`;
  const scopeIcon = item.scope === 'all' ? 'earth-americas' : 'users';

  return `
    <div class="assignment-card ${typeClass}">
      <div class="card-top-row">
        <div class="card-type-icon">${typeIcon}</div>
        <div class="card-main">
          <p class="card-title-text" title="${esc(item.title)}">${esc(item.title)}</p>
          <div class="card-chips">
            ${item.module_name ? `<span class="chip-module">${esc(item.module_name)}</span>` : ''}
            <span class="chip-scope ${item.scope === 'all' ? 'all' : 'clan'}">
              <i class="fa-solid fa-${scopeIcon}"></i> ${scopeLabel}
            </span>
            ${item.deadline ? buildDeadlineChip(item.deadline) : ''}
          </div>
        </div>
        <div class="three-dot-wrapper">
          <button class="btn-three-dot" data-menu-id="${item.id}" title="Opciones">
            <i class="fa-solid fa-ellipsis-vertical"></i>
          </button>
          <div class="three-dot-dropdown hidden" id="dropdown-${item.id}">
            <button class="dropdown-item btn-delete-item" data-id="${item.id}" data-kind="assignment">
              <i class="fa-solid fa-trash"></i> Eliminar
            </button>
          </div>
        </div>
      </div>
      <div class="card-meta-row">
        <span><i class="fa-regular fa-clock" style="margin-right:5px"></i>${relativeTime(item.created_at)}</span>
        ${
          item.content_type === 'repo' && item.repo_url
            ? `<a href="${esc(item.repo_url)}" target="_blank" rel="noopener"
               style="font-size:11.5px;color:var(--accent);text-decoration:none">
               <i class="fa-solid fa-arrow-up-right-from-square"></i> Ver repo
             </a>`
            : item.file_name
              ? `<span style="font-size:11px;color:var(--text-muted)">${esc(item.file_name)}</span>`
              : ''
        }
      </div>
    </div>`;
}

/* ══════════════════════════════════════
   DELETE
══════════════════════════════════════ */
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
    assignments = assignments.filter((a) => String(a.id) !== String(id));
    renderGrid();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteResource(id) {
  if (!confirm('¿Eliminar este recurso? Los coders ya no podrán usarlo.'))
    return;
  try {
    const res = await fetch(`${API}/tl/resource/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Error al eliminar.');
    showToast('Recurso eliminado', 'info');
    resources = resources.filter((r) => String(r.id) !== String(id));
    renderGrid();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ══════════════════════════════════════
   ADD ACTIVITY MODAL
══════════════════════════════════════ */
function wireAddModal() {
  el('btn-open-add').addEventListener('click', openAddModal);
  el('btn-close-add').addEventListener('click', closeAddModal);
  el('btn-do-add').addEventListener('click', submitAssignment);

  el('scope-clan').addEventListener('click', () => setScope('clan'));
  el('scope-all').addEventListener('click', () => setScope('all'));
  el('type-pdf').addEventListener('click', () => setContentType('pdf'));
  el('type-repo').addEventListener('click', () => setContentType('repo'));

  const dz = el('a-drop-zone');
  dz.addEventListener('click', () => el('a-file-input').click());
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

  el('a-file-input').addEventListener('change', () => {
    selectedFile = el('a-file-input').files[0] || null;
    updateDropZone();
  });

  el('a-repo-url').addEventListener('input', detectGithubUrl);

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

function setContentType(t) {
  currentType = t;
  el('type-pdf').classList.toggle('active', t === 'pdf');
  el('type-repo').classList.toggle('active', t === 'repo');
  el('pdf-section').classList.toggle('hidden', t !== 'pdf');
  el('repo-section').classList.toggle('hidden', t !== 'repo');
}

function updateDropZone() {
  const content = el('a-drop-content');
  if (selectedFile) {
    el('a-drop-zone').classList.add('has-file');
    content.innerHTML = `
      <i class="fa-solid fa-file-pdf" style="font-size:24px;color:#10b981;margin-bottom:6px"></i>
      <p style="font-size:13px;font-weight:700;color:var(--text-main);margin:0">${esc(selectedFile.name)}</p>
      <p style="font-size:11px;color:var(--text-muted);margin:3px 0 0">
        ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB · Click para cambiar
      </p>`;
  } else {
    el('a-drop-zone').classList.remove('has-file');
    content.innerHTML = `
      <i class="fa-solid fa-file-pdf" style="font-size:28px;color:#ef4444;margin-bottom:8px"></i>
      <p style="font-size:13px;font-weight:600;color:var(--text-main);margin:0">Haz clic o arrastra el PDF aquí</p>
      <p style="font-size:11px;color:var(--text-muted);margin:4px 0 0">Máximo 20 MB · Solo PDF</p>`;
  }
}

function detectGithubUrl() {
  const url = el('a-repo-url').value.trim();
  if (url.includes('github.com') && url.startsWith('http')) {
    el('github-preview').classList.remove('hidden');
    el('github-preview-url').textContent = url.replace(/^https?:\/\//, '');
  } else {
    el('github-preview').classList.add('hidden');
  }
}

async function submitAssignment() {
  const title = el('a-title').value.trim();
  const btn = el('btn-do-add');

  if (!title) return setStatus('a-status', 'error', 'El título es requerido.');
  if (currentType === 'pdf' && !selectedFile)
    return setStatus('a-status', 'error', 'Selecciona un archivo PDF.');
  if (currentType === 'pdf' && selectedFile.type !== 'application/pdf')
    return setStatus('a-status', 'error', 'Solo se aceptan PDFs.');
  if (currentType === 'pdf' && selectedFile.size > 20 * 1024 * 1024)
    return setStatus('a-status', 'error', 'El archivo supera los 20 MB.');
  if (currentType === 'repo' && !el('a-repo-url').value.trim())
    return setStatus('a-status', 'error', 'Ingresa la URL del repositorio.');

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publicando...';
  setStatus('a-status', 'info', 'Subiendo y notificando coders...');

  try {
    const form = new FormData();
    form.append('title', title);
    form.append('moduleId', el('a-module').value);
    form.append('scope', currentScope);
    form.append('contentType', currentType);
    if (el('a-deadline').value) form.append('deadline', el('a-deadline').value);
    if (currentType === 'pdf') form.append('file', selectedFile);
    if (currentType === 'repo')
      form.append('repoUrl', el('a-repo-url').value.trim());

    const res = await fetch(`${API}/tl/assignment`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al publicar.');

    const n = data.notified || 0;
    showToast(
      `✓ Actividad publicada · ${n} coder${n !== 1 ? 's' : ''} notificado${n !== 1 ? 's' : ''}`,
      'success'
    );
    closeAddModal();
    await loadAll();
  } catch (err) {
    setStatus('a-status', 'error', err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML =
      '<i class="fa-solid fa-paper-plane"></i> Publicar actividad';
  }
}

/* ══════════════════════════════════════
   RAG MODAL
══════════════════════════════════════ */
function wireRagModal() {
  el('btn-open-rag').addEventListener('click', openRagModal);
  el('btn-close-rag').addEventListener('click', closeRagModal);
  el('btn-do-upload').addEventListener('click', doUpload);

  const dz = el('drop-zone');
  dz.addEventListener('click', () => el('upload-file-input').click());
  dz.addEventListener('dragover', (e) => {
    e.preventDefault();
    dz.classList.add('dragover');
  });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', (e) => {
    e.preventDefault();
    dz.classList.remove('dragover');
    _ragFile = e.dataTransfer.files[0] || null;
    updateRagDropZone();
  });

  el('upload-file-input').addEventListener('change', () => {
    _ragFile = el('upload-file-input').files[0] || null;
    updateRagDropZone();
  });

  el('upload-resource-modal').addEventListener('click', (e) => {
    if (e.target === el('upload-resource-modal')) closeRagModal();
  });
}

function openRagModal() {
  el('upload-resource-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  setStatus('upload-status', '', '');
  el('upload-progress').classList.add('hidden');
  el('upload-progress-bar').style.width = '0%';
}

function closeRagModal() {
  el('upload-resource-modal').classList.add('hidden');
  document.body.style.overflow = '';
  _ragFile = null;
  updateRagDropZone();
  el('upload-title').value = '';
}

function updateRagDropZone() {
  const content = el('drop-zone-content');
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

async function doUpload() {
  const title = el('upload-title').value.trim();
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

  el('upload-progress').classList.remove('hidden');
  el('upload-progress-bar').style.width = '30%';

  try {
    const form = new FormData();
    form.append('file', _ragFile);
    form.append('title', title);
    form.append('moduleId', el('upload-module').value);

    const res = await fetch(`${API}/tl/resource/upload`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    const data = await res.json();
    el('upload-progress-bar').style.width = '100%';

    if (res.ok && data.success) {
      setStatus(
        'upload-status',
        'success',
        '✓ PDF subido. El embedding se procesa en ~10s.'
      );
      showToast('Recurso RAG subido correctamente', 'success');
      setTimeout(async () => {
        closeRagModal();
        await loadAll();
      }, 1800);
    } else {
      setStatus('upload-status', 'error', data.error || 'Error al subir.');
    }
  } catch (err) {
    setStatus('upload-status', 'error', `No se pudo conectar: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-upload"></i> Subir PDF';
  }
}

/* ══════════════════════════════════════
   UTILS
══════════════════════════════════════ */
function showToast(msg, type = 'success') {
  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    info: 'fa-circle-info',
  };
  el('toast-icon').className = `fa-solid ${icons[type] || icons.info}`;
  el('toast-msg').textContent = msg;
  const t = el('toast');
  t.className = `toast ${type}`;
  t.classList.remove('hidden');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.add('hidden'), 3500);
}

function setStatus(id, type, msg) {
  const s = el(id);
  if (!s) return;
  if (!msg) {
    s.classList.add('hidden');
    return;
  }
  s.className = `upload-status ${type}`;
  s.textContent = msg;
  s.classList.remove('hidden');
}

function buildDeadlineChip(deadline) {
  const diff = Math.round((new Date(deadline) - new Date()) / 86400000);
  const cls = diff < 0 ? 'overdue' : diff <= 3 ? 'soon' : 'ok';
  const text =
    diff < 0
      ? `Venció hace ${Math.abs(diff)}d`
      : diff === 0
        ? 'Vence hoy'
        : `Vence en ${diff}d`;
  return `<span class="chip-deadline ${cls}"><i class="fa-regular fa-calendar"></i> ${text}</span>`;
}

function relativeTime(iso) {
  if (!iso) return '—';
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (mins < 2) return 'Hace un momento';
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  return `Hace ${Math.floor(hrs / 24)}d`;
}

function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '—';
}

function esc(s) {
  return s
    ? s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    : '';
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

// Expose for HTML error banner retry button
window.loadAssignments = loadAll;
