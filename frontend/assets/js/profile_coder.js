/**
 * assets/js/profile_coder.js
 */
import { guards } from '../../src/core/auth/session.js';
import { invalidateMyAvatar } from '../../src/core/utils/avatarService.js';
import { profileService } from '../../src/core/services/profileService.js';

let profileData = null;
let isEditMode = false;
let isReadOnly = false;

const el = (id) => document.getElementById(id);

/* TOAST */
function toast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
      position:fixed;bottom:80px;right:24px;
      display:flex;flex-direction:column;gap:10px;
      z-index:9999;pointer-events:none;
    `;
    document.body.appendChild(container);
  }
  if (!document.getElementById('toast-style')) {
    const s = document.createElement('style');
    s.id = 'toast-style';
    s.textContent = `
      @keyframes slideIn  { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
      @keyframes slideOut { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(20px)} }
    `;
    document.head.appendChild(s);
  }
  const colors = {
    success: { bg: '#16a34a', icon: '✓' },
    error: { bg: '#dc2626', icon: '✕' },
    info: { bg: '#7c3aed', icon: 'ℹ' },
  };
  const { bg, icon } = colors[type] || colors.info;
  const t = document.createElement('div');
  t.style.cssText = `display:flex;align-items:center;gap:10px;background:${bg};color:white;
    padding:12px 18px;border-radius:12px;font-size:.88rem;font-weight:600;
    box-shadow:0 8px 24px rgba(0,0,0,.35);pointer-events:auto;
    animation:slideIn .25s ease;max-width:320px;`;
  t.innerHTML = `<span style="font-size:1rem">${icon}</span><span>${message}</span>`;
  container.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'slideOut .25s ease forwards';
    setTimeout(() => t.remove(), 260);
  }, 3000);
}

/* SPINNER + SKELETON */
function showPageSpinner() {
  if (document.getElementById('page-spinner')) return;
  const style = document.createElement('style');
  style.id = 'spinner-style';
  style.textContent = `
    #page-spinner {
      position:fixed;inset:0;background:var(--bg-body,#050505);
      display:flex;flex-direction:column;align-items:center;
      justify-content:center;gap:16px;z-index:8888;transition:opacity .3s ease;
    }
    #page-spinner .spin-ring {
      width:48px;height:48px;border:3px solid rgba(168,85,247,.2);
      border-top-color:var(--accent,#a855f7);border-radius:50%;
      animation:spin .7s linear infinite;
    }
    #page-spinner p { color:var(--text-muted,#94a3b8);font-size:.85rem;margin:0; }
    @keyframes spin { to{transform:rotate(360deg)} }
    .stat-skeleton {
      width:48px;height:28px;border-radius:6px;display:inline-block;
      background:linear-gradient(90deg,rgba(255,255,255,.06) 25%,rgba(255,255,255,.12) 50%,rgba(255,255,255,.06) 75%);
      background-size:200% 100%;animation:shimmer 1.2s infinite;
    }
    @keyframes shimmer { to{background-position:-200% 0} }
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

function showStatSkeletons() {
  if (el('statAvg'))
    el('statAvg').innerHTML = '<span class="stat-skeleton"></span>';
  if (el('statWeek'))
    el('statWeek').innerHTML = '<span class="stat-skeleton"></span>';
}

/* BOOTSTRAP */
(async function init() {
  showPageSpinner();
  showStatSkeletons();
  setDate();

  const session = await guards.requireAuth();
  if (!session) {
    hidePageSpinner();
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const profileId = urlParams.get('id');
  isReadOnly = !!profileId && profileId !== String(session.user.id);

  await loadProfile(profileId);
  hidePageSpinner();
  wireEvents();
})();

/* LOAD */
async function loadProfile(profileId = null) {
  try {
    const res = profileId
      ? await profileService.getProfileById(profileId)
      : await profileService.getMyProfile();

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    profileData = data;
    renderProfile(data);
  } catch (err) {
    console.error('[profile_coder] loadProfile:', err.message);
    toast('Error al cargar el perfil', 'error');
    if (el('statAvg')) el('statAvg').textContent = '0';
    if (el('statWeek')) el('statWeek').textContent = '1';
  }
}

/* RENDER */
function renderProfile(d) {
  const topbarTitle = document.querySelector('.topbar-title');
  const backBtn = document.querySelector('.back-btn');

  const currentDir = window.location.pathname
    .replace(/\/$/, '')
    .split('/')
    .slice(0, -1)
    .join('/');
  const toDashboard = (role) =>
    role === 'tl'
      ? `${currentDir}/../tl/dashboard.html`
      : `${currentDir}/dashboard.html`;

  if (isReadOnly) {
    document.title = `Kairo | Perfil de ${d.fullName || 'Coder'}`;
    if (topbarTitle)
      topbarTitle.textContent = `Perfil de ${d.fullName || 'Coder'}`;
    if (backBtn) backBtn.href = toDashboard('tl');
    el('btnEditProfile')?.classList.add('hidden');
    el('btnSaveProfile')?.classList.add('hidden');
    el('btnPreviewCV')?.classList.add('hidden');
    el('btnDownloadCV')?.classList.add('hidden');
    // Ocultar overlay de editar avatar
    document.querySelector('.avatar-edit-overlay')?.classList.add('hidden');
  } else {
    document.title = 'Kairo | Mi Perfil';
    if (topbarTitle) topbarTitle.textContent = 'Mi Perfil';
    if (backBtn) backBtn.href = toDashboard('coder');
  }

  el('fullName').textContent = d.fullName || '--';
  el('userRoleBadge').textContent = 'Coder';
  el('bioText').textContent = d.personalInfo.bio || 'Sin biografía definida.';
  el('bioInput').value = d.personalInfo.bio || '';

  // ── Avatar ───────────────────────────────────────────────────
  const avatarUrl = d.metadata?.avatarUrl;
  el('mainAvatar').innerHTML = avatarUrl
    ? `<img src="${avatarUrl}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`
    : `<span id="avatarFallback">${(d.fullName || 'C').charAt(0)}</span>`;

  // ── Info personal ────────────────────────────────────────────
  el('emailText').textContent = d.email || '--';
  el('phoneText').textContent = d.personalInfo.phone || 'No especificado';
  el('phoneInput').value = d.personalInfo.phone || '';
  el('locationText').textContent = d.personalInfo.location || 'No especificada';
  el('locationInput').value = d.personalInfo.location || '';

  const bd = d.personalInfo.birthDate;
  el('birthDateText').textContent = bd ? bd.split('T')[0] : 'No especificada';
  el('birthDateInput').value = bd ? bd.split('T')[0] : '';

  // ── Socials ──────────────────────────────────────────────────
  el('githubText').textContent = d.socials.github || 'github.com/usuario';
  el('githubInput').value = d.socials.github || '';
  el('linkedinText').textContent =
    d.socials.linkedin || 'linkedin.com/in/usuario';
  el('linkedinInput').value = d.socials.linkedin || '';
  el('twitterText').textContent = d.socials.twitter || 'twitter.com/usuario';
  el('twitterInput').value = d.socials.twitter || '';
  el('portfolioText').textContent = d.socials.portfolio || 'mi-portafolio.dev';
  el('portfolioInput').value = d.socials.portfolio || '';

  // ── Skills ───────────────────────────────────────────────────
  renderSkills(d.metadata?.skills || []);

  // ── Stats ────────────────────────────────────────────────────
  const avg = d.progress?.averageScore ?? 0;
  const week = d.progress?.currentWeek ?? 1;
  if (el('statAvg'))
    el('statAvg').textContent = avg > 0 ? parseFloat(avg).toFixed(1) : '0';
  if (el('statWeek')) el('statWeek').textContent = `${week}`;
}

function renderSkills(skills) {
  const list = el('skillsList');
  if (!skills.length) {
    list.innerHTML =
      '<span style="color:var(--text-muted);font-size:.85rem;">Sin habilidades añadidas.</span>';
    return;
  }
  list.innerHTML = skills
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

/* EVENTS */
function wireEvents() {
  if (isReadOnly) {
    el('btnPreviewCV')?.addEventListener('click', openCVModal);
    el('btnCloseModal')?.addEventListener('click', () =>
      el('cvModal').classList.remove('active')
    );
    el('cvModal')?.addEventListener('click', (e) => {
      if (e.target === el('cvModal')) el('cvModal').classList.remove('active');
    });
    return;
  }

  el('btnEditProfile').addEventListener('click', toggleEditMode);
  el('btnSaveProfile').addEventListener('click', saveProfile);
  el('btnAddSkill').addEventListener('click', addSkill);
  el('newSkillInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addSkill();
  });
  el('avatarInput').addEventListener('change', handleAvatarChange);

  el('btnPreviewCV').addEventListener('click', openCVModal);
  el('btnDownloadCV').addEventListener('click', generatePDF);
  el('btnCloseModal').addEventListener('click', () =>
    el('cvModal').classList.remove('active')
  );
  el('btnModalDownload').addEventListener('click', generatePDF);
  el('cvModal').addEventListener('click', (e) => {
    if (e.target === el('cvModal')) el('cvModal').classList.remove('active');
  });
}

/* EDIT MODE */
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
  el('skillEditArea').classList.toggle('hidden', !isEditMode);

  el('btnSaveProfile').classList.toggle('hidden', !isEditMode);
  el('btnPreviewCV').classList.toggle('hidden', isEditMode);
  el('btnDownloadCV').classList.toggle('hidden', isEditMode);

  el('btnEditProfile').querySelector('i').className = isEditMode
    ? 'fa-solid fa-xmark'
    : 'fa-solid fa-user-pen';

  renderSkills(profileData?.metadata?.skills || []);
}

/* SAVE */
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
      birthDate: el('birthDateInput').value || null, // "" → null para Postgres DATE
      bio: el('bioInput').value.trim() || null,
    },
    socials: {
      github: el('githubInput').value.trim() || null,
      linkedin: el('linkedinInput').value.trim() || null,
      twitter: el('twitterInput').value.trim() || null,
      portfolio: el('portfolioInput').value.trim() || null,
    },
    metadata: { skills: profileData.metadata.skills },
  };

  try {
    const res = await profileService.updateProfile(payload);
    const data = await res.json();
    if (!res.ok)
      throw new Error(
        typeof data.error === 'string' ? data.error : `Error ${res.status}`
      );

    profileData.personalInfo = {
      ...profileData.personalInfo,
      ...payload.personalInfo,
    };
    profileData.socials = { ...profileData.socials, ...payload.socials };

    toggleEditMode();
    renderProfile(profileData);
    toast('Perfil actualizado correctamente', 'success');
  } catch (err) {
    console.error('[profile_coder] saveProfile:', err.message);
    toast(err.message || 'No se pudo guardar', 'error');
  } finally {
    btnSave.disabled = false;
    btnSave.innerHTML = '<i class="fa-solid fa-check"></i> Guardar Cambios';
  }
}

/* SKILLS */
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

/* AVATAR — auto-save a MongoDB */
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
      await profileService.updateProfile({ metadata: { avatarUrl: base64 } });
      invalidateMyAvatar();
      toast('Foto de perfil actualizada', 'success');
    } catch {
      toast('Foto guardada localmente', 'info');
    }
  };
  reader.readAsDataURL(file);
}

/* CV MODAL */
function openCVModal() {
  const d = profileData;
  if (!d) return;
  el('cvContainer').innerHTML = `
    <div style="font-family:'Inter',sans-serif;color:#111;padding:40px;min-height:400px;">
      <div style="display:flex;gap:24px;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #7c3aed;">
        <div style="width:80px;height:80px;background:#7c3aed;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:2rem;color:white;flex-shrink:0;">
          ${d.fullName.charAt(0)}
        </div>
        <div>
          <h1 style="margin:0 0 4px;font-size:1.6rem;font-weight:800;">${d.fullName}</h1>
          <h2 style="margin:0 0 10px;font-size:.95rem;font-weight:500;color:#7c3aed;">Full Stack Developer · Riwi</h2>
          <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:.8rem;color:#555;">
            <span>✉ ${d.email}</span>
            ${d.personalInfo.phone ? `<span>☎ ${d.personalInfo.phone}</span>` : ''}
            ${d.personalInfo.location ? `<span>📍 ${d.personalInfo.location}</span>` : ''}
          </div>
        </div>
      </div>
      ${
        d.personalInfo.bio
          ? `
        <div style="margin-bottom:24px;">
          <h3 style="font-size:.8rem;text-transform:uppercase;letter-spacing:1px;color:#7c3aed;margin-bottom:8px;">Perfil</h3>
          <p style="margin:0;line-height:1.7;color:#333;">${d.personalInfo.bio}</p>
        </div>`
          : ''
      }
      ${
        d.metadata.skills.length
          ? `
        <div style="margin-bottom:24px;">
          <h3 style="font-size:.8rem;text-transform:uppercase;letter-spacing:1px;color:#7c3aed;margin-bottom:10px;">Habilidades</h3>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            ${d.metadata.skills.map((s) => `<span style="background:#f3f0ff;color:#5b21b6;padding:3px 12px;border-radius:6px;font-size:.8rem;font-weight:600;">${s}</span>`).join('')}
          </div>
        </div>`
          : ''
      }
      <div>
        <h3 style="font-size:.8rem;text-transform:uppercase;letter-spacing:1px;color:#7c3aed;margin-bottom:10px;">Redes</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:.82rem;color:#333;">
          ${d.socials.github ? `<div>🔗 <b>GitHub:</b> ${d.socials.github}</div>` : ''}
          ${d.socials.linkedin ? `<div>💼 <b>LinkedIn:</b> ${d.socials.linkedin}</div>` : ''}
          ${d.socials.portfolio ? `<div>🌐 <b>Portfolio:</b> ${d.socials.portfolio}</div>` : ''}
          ${d.socials.twitter ? `<div>🐦 <b>Twitter:</b> ${d.socials.twitter}</div>` : ''}
        </div>
      </div>
    </div>`;
  el('cvModal').classList.add('active');
}

async function generatePDF() {
  if (!el('cvModal').classList.contains('active')) openCVModal();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'px', format: 'a4' });
  html2canvas(el('cvContainer'), { scale: 2, useCORS: true }).then((canvas) => {
    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    doc.addImage(
      canvas.toDataURL('image/png'),
      'PNG',
      0,
      0,
      pdfWidth,
      pdfHeight
    );
    doc.save(`CV_${profileData.fullName.replace(/\s+/g, '_')}.pdf`);
  });
}

/* UTILS */
function setDate() {
  const d = el('currentDate');
  if (d)
    d.textContent = new Date().toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
}
