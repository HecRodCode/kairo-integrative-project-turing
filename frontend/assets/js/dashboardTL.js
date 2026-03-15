/**
 * assets/js/dashboardTL.js
 * Dashboard TL — Kairo Project.
 */
import { guards, sessionManager } from '../../src/core/auth/session.js';
import {
  loadMyAvatar,
  loadCoderAvatar,
} from '../../src/core/utils/avatarService.js';
import { API_BASE } from '../../src/core/config.js';

let dashboardData = null;
let selectedCoder = null;
let activeFilter = 'all';
const el = (id) => document.getElementById(id);

/* BOOTSTRAP */
(async function init() {
  const session = await guards.requireAuth();
  if (!session) return;
  if (session.user.role !== 'tl') {
    sessionManager.redirectByRole(session.user);
    return;
  }

  wireFilters();
  wireFeedback();
  wireLogout();
  setDate();

  loadMyAvatar().catch((err) =>
    console.warn('[Dashboard] Avatar load failed:', err.message)
  );

  await loadDashboard();
  await loadSubmissions();
  await loadRanking();

  window.addEventListener('kairo-notification', (e) => {
    const n = e.detail;
    if (n.type === 'feedback_read' || n.type === 'system') {
      loadDashboard();
    }
  });
})();

/* LOAD DATA */
async function loadDashboard() {
  hideBanner();
  try {
    const res = await fetch(`${API_BASE}/tl/dashboard`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    dashboardData = data;
    renderAll(data);
  } catch (err) {
    console.error('[Dashboard TL]', err);
    showBanner(err.message);
  }
}

/* RENDER */
function renderAll(data) {
  renderTLInfo(data.tl);
  renderStats(data.overview);
  renderSkillsOverview(data.softSkillsAverage);
  renderLearningStyles(data.coders);
  renderTable(data.coders);
}

function renderTLInfo(tl) {
  if (!tl) return;
  el('clan-heading').textContent = cap(tl.clanId);
  el('topbar-name').textContent = tl.fullName;
}

function renderStats(ov) {
  el('st-total').textContent = ov.totalCoders;
  el('st-done').textContent = ov.completedOnboarding;
  el('st-pending').textContent = ov.pendingOnboarding;
  el('st-risk').textContent = ov.highRiskCoders;
  el('st-score').textContent = `${ov.clanAvgScore} pts`;
  if (ov.highRiskCoders > 0) {
    el('topbar-risk-badge').style.display = 'inline-flex';
    el('badge-risk-count').textContent = ov.highRiskCoders;
  }
}

const SKILL_MAP = [
  { key: 'autonomy', label: 'Autonomía' },
  { key: 'time_management', label: 'Gest. del tiempo' },
  { key: 'problem_solving', label: 'Resolución' },
  { key: 'communication', label: 'Comunicación' },
  { key: 'teamwork', label: 'Trabajo en eq.' },
];

function renderSkillsOverview(avg) {
  const container = el('skills-overview');
  if (!avg || Object.values(avg).every((v) => !v || v === 0)) {
    container.innerHTML = `<p style="font-size:13px;color:var(--text-muted);padding:8px 0">Sin datos de habilidades blandas.</p>`;
    return;
  }
  container.innerHTML = SKILL_MAP.map(({ key, label }) => {
    const val = avg[key] || 0;
    const pct = (val / 5) * 100;
    return `
      <div class="skill-item">
        <span class="skill-item-label">${label}</span>
        <div class="skill-bar-track"><div class="skill-bar-fill" style="width:${pct}%"></div></div>
        <span class="skill-item-val">${val > 0 ? val.toFixed(1) : '0.0'}</span>
      </div>`;
  }).join('');
}

function renderLearningStyles(coders) {
  const pie = el('learning-pie');
  const legend = el('learning-legend');
  if (!coders?.length) {
    legend.innerHTML =
      '<p style="color:var(--text-muted);font-size:12px">Sin datos</p>';
    return;
  }
  const counts = {
    visual: 0,
    auditory: 0,
    kinesthetic: 0,
    read_write: 0,
    mixed: 0,
    other: 0,
  };
  coders.forEach((c) => {
    const s = (c.learning_style || 'other').toLowerCase();
    if (counts.hasOwnProperty(s)) counts[s]++;
    else counts.other++;
  });
  const total = coders.length;
  const data = [
    {
      key: 'visual',
      label: 'Visual',
      color: 'var(--accent)',
      count: counts.visual,
    },
    {
      key: 'auditory',
      label: 'Auditivo',
      color: 'var(--code-blue)',
      count: counts.auditory,
    },
    {
      key: 'kinesthetic',
      label: 'Kinestésico',
      color: 'var(--color-success)',
      count: counts.kinesthetic,
    },
    {
      key: 'read_write',
      label: 'Lecto-escritor',
      color: 'var(--color-warning)',
      count: counts.read_write,
    },
    {
      key: 'mixed',
      label: 'Mixto',
      color: 'var(--accent-border)',
      count: counts.mixed,
    },
    {
      key: 'other',
      label: 'Sin diagnóstico',
      color: 'var(--border-glass)',
      count: counts.other,
    },
  ].filter((d) => d.count > 0);

  let cum = 0;
  pie.style.background = `conic-gradient(${data
    .map((d) => {
      const s = cum;
      const e = s + (d.count / total) * 100;
      cum = e;
      return `${d.color} ${s}% ${e}%`;
    })
    .join(', ')})`;

  legend.innerHTML = data
    .map(
      (d) => `
    <div class="legend-item">
      <span class="legend-dot" style="background:${d.color}"></span>
      <span class="legend-label">${d.label}</span>
      <span class="legend-val">${Math.round((d.count / total) * 100)}%</span>
    </div>`
    )
    .join('');
}

function renderTable(coders) {
  const filtered = applyFilter(coders);
  el('tbl-loading').style.display = 'none';
  if (!filtered.length) {
    el('tbl-wrap').classList.add('hidden');
    el('tbl-empty').classList.remove('hidden');
    return;
  }
  el('tbl-empty').classList.add('hidden');
  el('tbl-wrap').classList.remove('hidden');

  const tbody = el('coder-tbody');
  tbody.innerHTML = filtered
    .map((c) => {
      const isRisk = c.risk_level === 'high' || c.risk_level === 'critical';
      const isPend = c.first_login;
      const statusHTML = isRisk
        ? `<span class="status-risk"><i class="fa-solid fa-triangle-exclamation"></i> Riesgo</span>`
        : isPend
          ? `<span class="status-pending"><i class="fa-regular fa-clock"></i> Pendiente</span>`
          : `<span class="status-ok"><i class="fa-solid fa-circle-check"></i> Activo</span>`;
      return `
    <tr data-id="${c.id}" class="${selectedCoder?.id === c.id ? 'selected' : ''}">
      <td><strong>${c.full_name}</strong></td>
      <td>${
        c.kairo_score != null
          ? `<span class="score-pill">${c.kairo_score} pts</span>`
          : '<span class="score-pill" style="opacity:0.5">50 pts</span>'
      }</td>
      <td>${c.current_week > 0 ? `Sem. ${c.current_week}` : 'Sem. 1'}</td>
      <td>${
        c.learning_style
          ? `<span class="style-tag">${cap(c.learning_style)}</span>`
          : '<span style="color:var(--text-muted)">—</span>'
      }</td>
      <td>${statusHTML}</td>
    </tr>`;
    })
    .join('');

  tbody.querySelectorAll('tr[data-id]').forEach((row) => {
    row.addEventListener('click', () => {
      const id = parseInt(row.dataset.id);
      const coder = dashboardData.coders.find((c) => c.id === id);
      if (!coder) return;
      tbody
        .querySelectorAll('tr')
        .forEach((r) => r.classList.remove('selected'));
      row.classList.add('selected');
      selectedCoder = coder;
      renderDetail(coder);
    });
  });
}

/* ── Detail panel ── */
const SKILL_DETAIL = [
  { key: 'autonomy', label: 'Autonomía' },
  { key: 'time_management', label: 'Tiempo' },
  { key: 'problem_solving', label: 'Resolución' },
  { key: 'communication', label: 'Comunicación' },
  { key: 'teamwork', label: 'Equipo' },
];

function renderDetail(c) {
  el('detail-placeholder').style.display = 'none';
  const body = el('detail-body');
  body.classList.remove('hidden');
  body.style.display = 'flex';

  el('d-name').textContent = c.full_name;
  el('d-clan').textContent = cap(c.clan_id || '—');

  const avatarContainer = el('detail-avatar');
  if (avatarContainer) loadCoderAvatar(c.id, avatarContainer, c.full_name);

  const profileLinkContainer = el('d-profile-link');
  if (profileLinkContainer) {
    profileLinkContainer.innerHTML = `
      <a href="../coder/profile.html?id=${c.id}" class="btn-profile-view">
        <i class="fa-solid fa-user-tie"></i> Ver Perfil Profesional
      </a>`;
  }

  el('d-email').textContent = c.email;
  el('d-week').textContent =
    c.current_week > 0 ? `Semana ${c.current_week}` : 'Semana 1';
  el('d-score').textContent =
    c.kairo_score != null ? `${c.kairo_score} pts` : '50 pts';
  el('d-style').textContent = c.learning_style
    ? cap(c.learning_style)
    : 'Sin diagnóstico';

  const isRisk = c.risk_level === 'high' || c.risk_level === 'critical';
  el('d-risk').classList.toggle('hidden', !isRisk);

  el('d-skill-bars').innerHTML = SKILL_DETAIL.map(({ key, label }) => {
    const val = c[key] || 0;
    const pct = (val / 5) * 100;
    return `
      <div class="skill-bar-row">
        <span class="skill-bar-label">${label}</span>
        <div class="skill-bar-track"><div class="skill-bar-fill" style="width:${pct}%"></div></div>
        <span class="skill-bar-val">${val.toFixed(1)}</span>
      </div>`;
  }).join('');

  el('feedback-text').value = '';
  el('feedback-type').value = '';
  el('feedback-status').className = 'feedback-status hidden';
  el('feedback-status').textContent = '';
}

/* INTERACTIONS */
function wireFilters() {
  el('filter-row').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    activeFilter = chip.dataset.filter;
    el('filter-row')
      .querySelectorAll('.chip')
      .forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    if (dashboardData) renderTable(dashboardData.coders);
  });
}

function wireFeedback() {
  el('btn-feedback').addEventListener('click', async () => {
    if (!selectedCoder) return;
    const type = el('feedback-type').value;
    const text = el('feedback-text').value.trim();
    const status = el('feedback-status');
    if (!type || !text) {
      status.textContent = 'Selecciona el tipo y escribe un mensaje.';
      status.className = 'feedback-status err';
      return;
    }
    el('btn-feedback').disabled = true;
    try {
      const res = await fetch(`${API_BASE}/tl/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          coderId: selectedCoder.id,
          feedbackText: text,
          feedbackType: type,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar.');
      status.textContent = 'Feedback enviado correctamente.';
      status.className = 'feedback-status ok';
      el('feedback-text').value = '';
      el('feedback-type').value = '';
    } catch (err) {
      status.textContent = err.message;
      status.className = 'feedback-status err';
    } finally {
      el('btn-feedback').disabled = false;
    }
  });
}

el('btn-report')?.addEventListener('click', () => {
  if (!selectedCoder) return;
  generatePDF(selectedCoder);
});

function generatePDF(c) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.setTextColor(109, 40, 217);
  doc.text('Kairo — Reporte del Coder', 14, 20);
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(11);
  const rows = [
    ['Nombre', c.full_name],
    ['Email', c.email],
    ['Clan', cap(c.clan_id || '—')],
    ['Kairo Score', c.kairo_score != null ? `${c.kairo_score} pts` : '50 pts'],
    [
      'Score Moodle',
      c.average_score > 0 ? `${parseFloat(c.average_score).toFixed(1)}%` : '—',
    ],
    ['Semana actual', c.current_week > 0 ? `Semana ${c.current_week}` : '—'],
    ['Estilo', c.learning_style ? cap(c.learning_style) : 'Sin diagnóstico'],
    ['Riesgo', c.risk_level ? cap(c.risk_level) : 'Sin flags activos'],
    ['—————', '—————'],
    ['Autonomía', c.autonomy ? `${c.autonomy}/5` : '—'],
    ['Gest. tiempo', c.time_management ? `${c.time_management}/5` : '—'],
    ['Resolución', c.problem_solving ? `${c.problem_solving}/5` : '—'],
    ['Comunicación', c.communication ? `${c.communication}/5` : '—'],
    ['Equipo', c.teamwork ? `${c.teamwork}/5` : '—'],
  ];
  let y = 34;
  rows.forEach(([k, v]) => {
    doc.setFont(undefined, 'bold');
    doc.text(`${k}:`, 14, y);
    doc.setFont(undefined, 'normal');
    doc.text(String(v), 75, y);
    y += 9;
  });
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 14, 280);
  doc.save(
    `reporte-${c.id}-${c.full_name.toLowerCase().replace(/\s+/g, '-')}.pdf`
  );
}

function wireLogout() {
  el('btn-logout').addEventListener('click', () => sessionManager.logout());
}

/* HELPERS */
function applyFilter(coders) {
  if (activeFilter === 'risk')
    return coders.filter(
      (c) => c.risk_level === 'high' || c.risk_level === 'critical'
    );
  if (activeFilter === 'pending')
    return coders.filter((c) => c.first_login === true);
  return coders;
}
function showBanner(msg) {
  el('error-banner').classList.remove('hidden');
  if (msg) el('error-msg').textContent = msg;
}
function hideBanner() {
  el('error-banner').classList.add('hidden');
}
function setDate() {
  el('topbar-date').textContent = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
function cap(str) {
  if (!str) return '—';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* SUBMISSIONS */
let _currentSubmissions = [];

async function loadSubmissions() {
  try {
    const res = await fetch(`${API_BASE}/tl/submissions`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    _currentSubmissions = data.submissions || [];
    renderSubmissions(_currentSubmissions);
  } catch (err) {
    console.error('[TL] loadSubmissions:', err);
  }
}

function renderSubmissions(submissions) {
  const listEl = document.getElementById('submissions-list');
  const emptyEl = document.getElementById('submissions-empty');
  const countEl = document.getElementById('submissions-count');

  if (!submissions.length) {
    emptyEl.classList.remove('hidden');
    if (countEl) countEl.textContent = '0 envíos';
    return;
  }

  const pending = submissions.filter((s) => !s.reviewed_at).length;
  if (countEl)
    countEl.textContent = `${submissions.length} envíos · ${pending} sin revisar`;

  const LANG_COLORS = {
    sql: '#4fc3f7',
    python: '#ffb74d',
    javascript: '#fff176',
    html: '#ef9a9a',
  };
  const LANG_LABELS = {
    sql: 'SQL',
    python: 'Python',
    javascript: 'JS',
    html: 'HTML',
  };

  listEl.innerHTML = submissions
    .map((s) => {
      const langColor = LANG_COLORS[s.language] || '#ccc';
      const date = new Date(s.submitted_at).toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
      const initials = s.coder_name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      return `
    <div class="sub-row ${s.reviewed_at ? 'reviewed' : 'pending'}" id="sub-${s.id}">
      <div class="sub-row-left">
        <div class="sub-avatar">${initials}</div>
        <div class="sub-row-info">
          <span class="sub-row-name">${escapeHtml(s.coder_name)}</span>
          <span class="sub-row-exercise">${escapeHtml(s.exercise_title)} · Día ${s.day_number}</span>
        </div>
        <span class="sub-row-lang" style="color:${langColor}">${LANG_LABELS[s.language] || s.language}</span>
        <span class="sub-row-date">${date}</span>
      </div>
      <div class="sub-row-right">
        ${
          s.reviewed_at
            ? `<span class="sub-badge-reviewed"><i class="fa-solid fa-circle-check"></i> Revisado</span>`
            : `<span class="sub-badge-pending"><i class="fa-solid fa-clock"></i> Pendiente</span>`
        }
        <button class="btn-review-code"
          onclick="openReviewModal(${s.id}, '${escapeHtml(s.coder_name)}', '${escapeHtml(s.exercise_title)}', ${s.day_number}, '${s.language}', ${s.reviewed_at ? 'true' : 'false'})">
          <i class="fa-solid fa-code"></i> Revisar código
        </button>
      </div>
    </div>`;
    })
    .join('');
}

window.openReviewModal = function (
  id,
  coderName,
  exerciseTitle,
  dayNumber,
  language,
  isReviewed
) {
  const sub = _currentSubmissions.find((s) => s.id === id);
  if (!sub) return;

  const LANG_LABELS = {
    sql: 'SQL',
    python: 'Python',
    javascript: 'JS',
    html: 'HTML',
  };
  const modal = document.getElementById('review-modal');

  document.getElementById('rm-title').textContent =
    `${exerciseTitle} — Día ${dayNumber}`;
  document.getElementById('rm-coder').textContent = coderName;
  document.getElementById('rm-lang').textContent =
    LANG_LABELS[language] || language;
  document.getElementById('rm-code').value = sub.code_submitted || '';
  document.getElementById('rm-expected').textContent =
    sub.expected_output || '—';

  const feedbackSection = document.getElementById('rm-feedback-section');
  const reviewedSection = document.getElementById('rm-reviewed-section');

  if (isReviewed) {
    feedbackSection.classList.add('hidden');
    reviewedSection.classList.remove('hidden');
    document.getElementById('rm-existing-feedback').textContent =
      sub.tl_feedback_text || '';
  } else {
    feedbackSection.classList.remove('hidden');
    reviewedSection.classList.add('hidden');
    document.getElementById('rm-feedback-input').value = '';
  }

  document.getElementById('rm-btn-send').onclick = () => sendReviewFeedback(id);
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
};

window.closeReviewModal = function () {
  document.getElementById('review-modal').classList.add('hidden');
  document.body.style.overflow = '';
};

async function sendReviewFeedback(submissionId) {
  const feedbackText = document
    .getElementById('rm-feedback-input')
    .value.trim();
  if (!feedbackText) {
    document.getElementById('rm-feedback-input').focus();
    return;
  }

  const btn = document.getElementById('rm-btn-send');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';

  try {
    const res = await fetch(
      `${API_BASE}/tl/submissions/${submissionId}/review`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackText }),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    closeReviewModal();
    showToast('Feedback enviado. El coder ganó +15 puntos.', 'success');
    await loadSubmissions();
  } catch (err) {
    console.error('[sendReviewFeedback]', err);
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar feedback';
    showToast('Error al enviar feedback.', 'error');
  }
}

/* RANKING */
async function loadRanking() {
  try {
    const res = await fetch(`${API_BASE}/tl/ranking`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    renderRanking(data);
  } catch (err) {
    console.error('[TL] loadRanking:', err);
  }
}

function renderRanking(data) {
  const section = document.getElementById('ranking-section');
  if (!section) return;

  const MEDALS = ['🥇', '🥈', '🥉'];

  const renderList = (coders) =>
    coders
      .map(
        (c, i) => `
    <div class="ranking-row ${i < 3 ? 'top-' + (i + 1) : ''}">
      <span class="ranking-pos">${MEDALS[i] || `#${c.rank}`}</span>
      <span class="ranking-name">${escapeHtml(c.full_name)}</span>
      ${
        c.clan !== data.clan
          ? `<span class="ranking-clan">${escapeHtml(c.clan)}</span>`
          : ''
      }
      <span class="ranking-score">${c.kairo_score} pts</span>
    </div>
  `
      )
      .join('');

  section.innerHTML = `
    <div class="ranking-grid">
      <div class="glass-card ranking-card">
        <div class="card-head">
          <h2 class="card-title"><i class="fa-solid fa-trophy"></i> Ranking del Clan</h2>
          <span class="card-meta">${escapeHtml(data.clan)}</span>
        </div>
        <div class="ranking-list">
          ${
            data.clanRanking?.length
              ? renderList(data.clanRanking)
              : '<p style="color:var(--text-muted);font-size:13px;padding:8px 0">Sin datos aún</p>'
          }
        </div>
      </div>
      <div class="glass-card ranking-card">
        <div class="card-head">
          <h2 class="card-title"><i class="fa-solid fa-earth-americas"></i> Ranking Global</h2>
          <span class="card-meta">Todos los clanes</span>
        </div>
        <div class="ranking-list">
          ${
            data.globalRanking?.length
              ? renderList(data.globalRanking)
              : '<p style="color:var(--text-muted);font-size:13px;padding:8px 0">Sin datos aún</p>'
          }
        </div>
      </div>
    </div>`;
}

/* TOAST helper  */
function showToast(msg, type = 'success') {
  const toast = el('toast');
  const toastMsg = el('toast-msg');
  const toastIcon = el('toast-icon');
  if (!toast) return;

  toastMsg.textContent = msg;
  toastIcon.className =
    type === 'success'
      ? 'fa-solid fa-circle-check'
      : 'fa-solid fa-circle-exclamation';
  toast.className = `toast ${type}`;

  setTimeout(() => {
    toast.className = 'toast hidden';
  }, 3500);
}

window.loadDashboard = loadDashboard;
