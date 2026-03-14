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

/* ══════════════════════════════════════
   BOOTSTRAP
══════════════════════════════════════ */
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

  // Carga avatar del TL en el topbar (no bloquea el dashboard)
  loadMyAvatar();

  await loadDashboard();

  window.addEventListener('kairo-notification', (e) => {
    const n = e.detail;
    if (n.type === 'feedback_read' || n.type === 'system') {
      loadDashboard();
    }
  });
})();

/* ══════════════════════════════════════
   LOAD DATA
══════════════════════════════════════ */
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

/* ══════════════════════════════════════
   RENDER
══════════════════════════════════════ */
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
  el('st-score').textContent =
    ov.clanAvgScore > 0 ? `${parseFloat(ov.clanAvgScore).toFixed(1)}%` : '0.0%';
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
    other: 0,
  };
  coders.forEach((c) => {
    const s = (c.learning_style || 'other').toLowerCase();
    counts.hasOwnProperty(s) ? counts[s]++ : counts.other++;
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
      key: 'other',
      label: 'No diagnosticado',
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
          c.average_score > 0
            ? `<span class="score-pill">${parseFloat(c.average_score).toFixed(1)}</span>`
            : '<span class="score-pill" style="opacity:0.5">0.0</span>'
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

  // ── Avatar del coder — carga async desde MongoDB ──────────────
  const avatarContainer = el('detail-avatar');
  if (avatarContainer) {
    loadCoderAvatar(c.id, avatarContainer, c.full_name);
  }

  // Perfil link
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
    c.average_score > 0 ? `${parseFloat(c.average_score).toFixed(1)}%` : '0.0%';
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

/* ══════════════════════════════════════
   INTERACTIONS
══════════════════════════════════════ */
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
    [
      'Score promedio',
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

/* ══════════════════════════════════════
   HELPERS
══════════════════════════════════════ */
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
window.loadDashboard = loadDashboard;
