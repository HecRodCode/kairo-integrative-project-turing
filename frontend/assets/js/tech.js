import { API_BASE } from '../../src/core/config.js';

/* ── File selection ─────────────────────────────────────────── */
const fileInput = document.getElementById('upload-file-input');
const dropZone = document.getElementById('drop-zone');
let _selected = null;

fileInput?.addEventListener('change', () => {
  _selected = fileInput.files[0] || null;
  _updateDropZone();
});

dropZone?.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone?.addEventListener('dragleave', () =>
  dropZone.classList.remove('dragover')
);
dropZone?.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  _selected = e.dataTransfer.files[0] || null;
  _updateDropZone();
});

function _updateDropZone() {
  const content = document.getElementById('drop-zone-content');
  if (_selected) {
    dropZone.classList.add('has-file');
    content.innerHTML = `
      <i class="fa-solid fa-file-pdf" style="font-size:24px;color:#10b981;margin-bottom:6px"></i>
      <p style="font-size:13px;font-weight:700;color:var(--text-main);margin:0">${_selected.name}</p>
      <p style="font-size:11px;color:var(--text-muted);margin:3px 0 0">
        ${(_selected.size / 1024 / 1024).toFixed(2)} MB — Click para cambiar
      </p>`;
  } else {
    dropZone.classList.remove('has-file');
    content.innerHTML = `
      <i class="fa-solid fa-file-pdf" style="font-size:28px;color:#ef4444;margin-bottom:8px"></i>
      <p style="font-size:13px;font-weight:600;color:var(--text-main);margin:0">Haz clic o arrastra el PDF aquí</p>
      <p style="font-size:11px;color:var(--text-muted);margin:4px 0 0">Máximo 20 MB · Solo PDF</p>`;
  }
}

/* ── Open / close ───────────────────────────────────────────── */
window.openUploadModal = function () {
  document.getElementById('upload-resource-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  _setStatus('', '');
  document.getElementById('upload-progress').classList.add('hidden');
};
window.closeUploadModal = function () {
  document.getElementById('upload-resource-modal').classList.add('hidden');
  document.body.style.overflow = '';
  _selected = null;
  _updateDropZone();
  document.getElementById('upload-title').value = '';
};

function _setStatus(type, msg) {
  const el = document.getElementById('upload-status');
  if (!msg) {
    el.classList.add('hidden');
    return;
  }
  el.className = `upload-status ${type}`;
  el.textContent = msg;
  el.classList.remove('hidden');
}

/* ── Do upload ──────────────────────────────────────────────── */
window.doUpload = async function () {
  const title = document.getElementById('upload-title').value.trim();
  const moduleId = document.getElementById('upload-module').value;
  const btn = document.getElementById('btn-do-upload');

  if (!title) return _setStatus('error', 'El título es requerido.');
  if (!_selected) return _setStatus('error', 'Selecciona un archivo PDF.');
  if (_selected.type !== 'application/pdf')
    return _setStatus('error', 'Solo se aceptan PDFs.');
  if (_selected.size > 20 * 1024 * 1024)
    return _setStatus('error', 'El archivo supera los 20 MB.');

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Subiendo...';
  _setStatus('info', 'Subiendo archivo...');

  // Simulated progress while uploading
  const prog = document.getElementById('upload-progress');
  const bar = document.getElementById('upload-progress-bar');
  prog.classList.remove('hidden');
  bar.style.width = '30%';

  try {
    const form = new FormData();
    form.append('file', _selected);
    form.append('title', title);
    form.append('moduleId', moduleId);

    const res = await fetch(`${API_BASE}/tl/resource/upload`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    const data = await res.json();

    bar.style.width = '100%';

    if (res.ok && data.success) {
      _setStatus(
        'success',
        '✓ PDF subido. El embedding se procesa en segundo plano (~10s).'
      );
      setTimeout(closeUploadModal, 2500);
    } else {
      _setStatus('error', data.error || 'Error al subir el archivo.');
    }
  } catch (err) {
    _setStatus('error', 'No se pudo conectar con el servidor.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-upload"></i> Subir PDF';
  }
};

/* ── List resources ─────────────────────────────────────────── */
window.openResourcesList = async function (moduleId = 4) {
  document.getElementById('list-module-label').textContent = moduleId;
  document.getElementById('resources-list-modal').classList.remove('hidden');

  const list = document.getElementById('tl-resources-list');
  list.innerHTML =
    '<p style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px 0">Cargando...</p>';

  try {
    const res = await fetch(`${API_BASE}/tl/resource/list?moduleId=${moduleId}`, {
      credentials: 'include',
    });
    const data = await res.json();

    if (!data.resources?.length) {
      list.innerHTML =
        '<p style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px 0">No hay recursos subidos aún.</p>';
      return;
    }

    list.innerHTML = data.resources
      .map(
        (r) => `
      <div class="tl-resource-item">
        <i class="fa-solid fa-file-pdf" style="font-size:20px;color:#ef4444;flex-shrink:0;margin-top:2px"></i>
        <div style="flex:1;min-width:0">
          <p style="font-size:13.5px;font-weight:700;color:var(--text-main);margin:0 0 3px">${r.title}</p>
          <p style="font-size:11.5px;color:var(--text-muted);margin:0 0 4px">${r.file_name}</p>
          <p style="font-size:11px;color:var(--text-muted);margin:0;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">
            ${r.preview_text || 'Sin vista previa disponible'}
          </p>
        </div>
        <button class="btn-delete-resource" onclick="deleteResource(${r.id}, ${moduleId})">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `
      )
      .join('');
  } catch {
    list.innerHTML =
      '<p style="color:var(--color-error);font-size:13px;text-align:center;padding:20px 0">Error al cargar recursos.</p>';
  }
};

window.deleteResource = async function (resourceId, moduleId) {
  if (!confirm('¿Eliminar este recurso? Los coders ya no podrán descargarlo.'))
    return;

  try {
    const res = await fetch(`${API_BASE}/tl/resource/${resourceId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) openResourcesList(moduleId);
  } catch {
    alert('Error al eliminar el recurso.');
  }
};
