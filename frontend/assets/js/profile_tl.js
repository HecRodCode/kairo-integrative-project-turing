/**
 * assets/js/profile_tl.js
 * FIXES:
 * - alert() → toast system
 * - removeSkill inline onclick → data-idx + addEventListener (ES module safe)
 * - Avatar auto-save inmediato al seleccionar
 * - loadTLMetrics → stats reales desde API
 * - Spinner de carga
 * - Tema usa theme.js global (no duplicar lógica)
 */
import { guards } from '/frontend/src/core/auth/session.js';

const API = 'http://localhost:3000/api';
let profileData = null;
let isEditMode = false;

const el = (id) => document.getElementById(id);

/* ══════════════════════════════════════
   TOAST SYSTEM
══════════════════════════════════════ */
function toast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
      position: fixed; bottom: 80px; right: 24px;
      display: flex; flex-direction: column; gap: 10px;
      z-index: 9999; pointer-events: none;
    `;
    document.body.appendChild(container);
  }
  if (!document.getElementById('toast-style')) {
    const style = document.createElement('style');
    style.id = 'toast-style';
    style.textContent = `
      @keyframes slideIn  { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
      @keyframes slideOut { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(20px)} }
    `;
    document.head.appendChild(style);
  }
  const colors = {
    success: { bg: '#16a34a', icon: '✓' },
    error: { bg: '#dc2626', icon: '✕' },
    info: { bg: '#7c3aed', icon: 'ℹ' },
  };
  const { bg, icon } = colors[type] || colors.info;
  const t = document.createElement('div');
  t.style.cssText = `
    display:flex;align-items:center;gap:10px;
    background:${bg};color:white;
    padding:12px 18px;border-radius:12px;
    font-size:.88rem;font-weight:600;
    box-shadow:0 8px 24px rgba(0,0,0,.35);
    pointer-events:auto;animation:slideIn .25s ease;max-width:320px;
  `;
  t.innerHTML = `<span style="font-size:1rem">${icon}</span><span>${message}</span>`;
  container.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'slideOut .25s ease forwards';
    setTimeout(() => t.remove(), 260);
  }, 3000);
}

/* ══════════════════════════════════════
   SPINNER
══════════════════════════════════════ */
function showPageSpinner() {
  if (document.getElementById('page-spinner')) return;
  const style = document.createElement('style');
  style.id = 'spinner-style';
  style.textContent = `
    #page-spinner {
      position:fixed;inset:0;background:var(--bg-body,#050505);
      display:flex;flex-direction:column;align-items:center;
      justify-content:center;gap:16px;z-index:8888;
      transition:opacity .3s ease;
    }
    #page-spinner .spin-ring {
      width:48px;height:48px;
      border:3px solid rgba(168,85,247,.2);
      border-top-color:var(--accent,#a855f7);
      border-radius:50%;animation:spin .7s linear infinite;
    }
    #page-spinner p { color:var(--text-muted,#94a3b8);font-size:.85rem;margin:0; }
    @keyframes spin { to{transform:rotate(360deg)} }
  `;
  document.head.appendChild(style);
  const spinner = document.createElement('div');
  spinner.id = 'page-spinner';
  spinner.innerHTML = `<div class="spin-ring"></div><p>Cargando perfil...</p>`;
  document.body.appendChild(spinner);
}

function hidePageSpinner() {
  const spinner = document.getElementById('page-spinner');
  if (!spinner) return;
  spinner.style.opacity = '0';
  setTimeout(() => spinner.remove(), 300);
}

/* ══════════════════════════════════════
   BOOTSTRAP
══════════════════════════════════════ */
(async function init() {
  showPageSpinner();
  setDate();

  const session = await guards.requireAuth();
  if (!session) {
    hidePageSpinner();
    return;
  }

  if (session.user.role !== 'tl' && session.user.role !== 'admin') {
    window.location.href = '../coder/profile.html';
    return;
  }

  await loadProfile();
  wireEvents();
  hidePageSpinner();
})();

/* ══════════════════════════════════════
   LOAD
══════════════════════════════════════ */
async function loadProfile() {
  try {
    const res = await fetch(`${API}/profile`, { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    profileData = data;
    renderProfile(data);
  } catch (err) {
    console.error('[Profile TL]', err.message);
    toast('Error al cargar el perfil', 'error');
  }
}

/* ══════════════════════════════════════
   RENDER
══════════════════════════════════════ */
function renderProfile(d) {
  el('fullName').textContent = d.fullName || '--';
  el('bioText').textContent =
    d.personalInfo.bio || 'Liderando equipos de alto rendimiento.';
  el('bioInput').value = d.personalInfo.bio || '';

  // Avatar — prioriza MongoDB, fallback a inicial
  const avatarUrl = d.metadata?.avatarUrl;
  el('mainAvatar').innerHTML = avatarUrl
    ? `<img src="${avatarUrl}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`
    : `<span id="avatarFallback">${(d.fullName || 'T').charAt(0)}</span>`;

  // Info personal
  el('emailText').textContent = d.email || '--';
  el('phoneText').textContent = d.personalInfo.phone || 'No especificado';
  el('phoneInput').value = d.personalInfo.phone || '';
  el('locationText').textContent = d.personalInfo.location || 'Medellín, CO';
  el('locationInput').value = d.personalInfo.location || '';

  // Socials
  el('linkedinText').textContent =
    d.socials.linkedin || 'linkedin.com/in/usuario';
  el('linkedinInput').value = d.socials.linkedin || '';
  el('githubText').textContent = d.socials.github || 'github.com/usuario';
  el('githubInput').value = d.socials.github || '';

  // Skills
  renderSkills(d.metadata?.skills || []);

  // Stats reales desde el controller (calculadas en profileControllers.js)
  if (el('statClans')) el('statClans').textContent = d.stats?.clans ?? '1';
  if (el('statCoders')) el('statCoders').textContent = d.stats?.coders ?? '0';
}

function renderSkills(skills) {
  const list = el('skillsList');
  const items = skills.length
    ? skills
    : ['Liderazgo', 'Gestión Ágil', 'Feedback'];

  list.innerHTML = items
    .map(
      (s, idx) => `
    <span class="skill-pill">
      ${s}
      ${
        isEditMode
          ? `<button class="btn-remove-skill" data-idx="${idx}" title="Eliminar"><i class="fa-solid fa-xmark"></i></button>`
          : ''
      }
    </span>
  `
    )
    .join('');

  if (isEditMode) {
    list.querySelectorAll('.btn-remove-skill').forEach((btn) => {
      btn.addEventListener('click', () => {
        profileData.metadata.skills.splice(parseInt(btn.dataset.idx), 1);
        renderSkills(profileData.metadata.skills);
      });
    });
  }
}

/* ══════════════════════════════════════
   EVENTS
══════════════════════════════════════ */
function wireEvents() {
  el('btnEditProfile').addEventListener('click', toggleEditMode);
  el('btnSaveProfile').addEventListener('click', saveProfile);
  el('btnAddSkill').addEventListener('click', addSkill);
  el('newSkillInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addSkill();
  });
  el('avatarInput').addEventListener('change', handleAvatarChange);
}

/* ══════════════════════════════════════
   EDIT MODE
══════════════════════════════════════ */
function toggleEditMode() {
  isEditMode = !isEditMode;
  document.body.classList.toggle('editing', isEditMode);

  document
    .querySelectorAll('.display-val')
    .forEach((d) => d.classList.toggle('hidden', isEditMode));
  el('bioText').classList.toggle('hidden', isEditMode);
  document
    .querySelectorAll('.edit-input')
    .forEach((i) => i.classList.toggle('hidden', !isEditMode));
  el('skillEditArea')?.classList.toggle('hidden', !isEditMode);
  el('btnSaveProfile').classList.toggle('hidden', !isEditMode);

  el('btnEditProfile').querySelector('i').className = isEditMode
    ? 'fa-solid fa-xmark'
    : 'fa-solid fa-user-pen';

  renderSkills(profileData?.metadata?.skills || []);
}

/* ══════════════════════════════════════
   SAVE
══════════════════════════════════════ */
async function saveProfile() {
  if (!profileData) return;

  const btnSave = el('btnSaveProfile');
  btnSave.disabled = true;
  btnSave.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

  const payload = {
    personalInfo: {
      phone: el('phoneInput').value.trim() || null,
      location: el('locationInput').value.trim() || null,
      bio: el('bioInput').value.trim() || null,
    },
    socials: {
      linkedin: el('linkedinInput').value.trim() || null,
      github: el('githubInput').value.trim() || null,
    },
    metadata: {
      skills: profileData.metadata.skills,
    },
  };

  try {
    const res = await fetch(`${API}/profile/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    const data = await res.json();

    if (!res.ok) {
      const msg =
        typeof data.error === 'string'
          ? data.error
          : `Error del servidor (${res.status})`;
      throw new Error(msg);
    }

    // Actualiza estado local sin recargar
    profileData.personalInfo = {
      ...profileData.personalInfo,
      ...payload.personalInfo,
    };
    profileData.socials = { ...profileData.socials, ...payload.socials };

    toggleEditMode();
    renderProfile(profileData);
    toast('Perfil actualizado correctamente', 'success');
  } catch (err) {
    console.error('[Profile TL] saveProfile:', err.message);
    toast(err.message || 'No se pudo guardar', 'error');
  } finally {
    btnSave.disabled = false;
    btnSave.innerHTML = '<i class="fa-solid fa-check"></i> Guardar Cambios';
  }
}

/* ══════════════════════════════════════
   SKILLS
══════════════════════════════════════ */
function addSkill() {
  const input = el('newSkillInput');
  const val = input.value.trim();
  if (!val) return;
  if (!profileData.metadata.skills.includes(val)) {
    profileData.metadata.skills.push(val);
    renderSkills(profileData.metadata.skills);
  }
  input.value = '';
  input.focus();
}

/* ══════════════════════════════════════
   AVATAR — auto-save inmediato a MongoDB
══════════════════════════════════════ */
function handleAvatarChange(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (re) => {
    const base64 = re.target.result;
    el('mainAvatar').innerHTML =
      `<img src="${base64}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`;

    if (!profileData.metadata) profileData.metadata = {};
    profileData.metadata.avatarUrl = base64;

    try {
      await fetch(`${API}/profile/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: { avatarUrl: base64 } }),
        credentials: 'include',
      });
      toast('Foto de perfil actualizada', 'success');
    } catch {
      toast('Foto guardada localmente, sincroniza al guardar', 'info');
    }
  };
  reader.readAsDataURL(file);
}

/* ══════════════════════════════════════
   UTILS
══════════════════════════════════════ */
function setDate() {
  const d = el('currentDate');
  if (d)
    d.textContent = new Date().toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
}
