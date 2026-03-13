/**
 * assets/js/dashboardTL.js
 * Dashboard TL — Kairo Project.
 * Conectado al endpoint real GET /api/tl/dashboard.
 */
import { guards, sessionManager } from '../../src/core/auth/session.js';

const API = 'http://localhost:3000/api';
/* ── State ── */
let dashboardData = null;
let selectedCoder = null;
let activeFilter = 'all';
/* ── Shorthand ── */
const $ = (id) => document.getElementById(id);
const el = (id) => document.getElementById(id);

/* ══════════════════════════════════════
   BOOTSTRAP
══════════════════════════════════════ */
(async function init() {
  // Guard: must be auth'd TL
  const session = await guards.requireAuth();
  if (!session) return;
  if (session.user.role !== 'tl') {
    sessionManager.redirectByRole(session.user);
    return;
  }
  
  // Wire static interactions
  wireFilters();
  wireFeedback();
  wireLogout();
  setDate();
  await loadDashboard();

  // Real-time Sync: refresh if relevant notifications arrive
  window.addEventListener('kairo-notification', (e) => {
    const n = e.detail;
    if (n.type === 'feedback_read' || n.type === 'system') {
      console.log('[SSE-Sync] Refreshing local dashboard stats...');
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
    const res = await fetch(`${API}/tl/dashboard`, { credentials: 'include' });
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
  renderTable(data.coders);
}

/* ── TL info ── */
function renderTLInfo(tl) {
  if (!tl) return;
  el('clan-heading').textContent = cap(tl.clanId);
  el('topbar-name').textContent = tl.fullName;
}

/* ── Stats ── */
function renderStats(ov) {
  el('st-total').textContent = ov.totalCoders;
  el('st-done').textContent = ov.completedOnboarding;
  el('st-pending').textContent = ov.pendingOnboarding;
  el('st-risk').textContent = ov.highRiskCoders;
  el('st-score').textContent =
    ov.clanAvgScore > 0 ? `${parseFloat(ov.clanAvgScore).toFixed(1)}%` : '—';
  // Risk badge in topbar
  if (ov.highRiskCoders > 0) {
    el('topbar-risk-badge').style.display = 'inline-flex';
    el('badge-risk-count').textContent = ov.highRiskCoders;
  }
}

/* ── Soft skills overview ── */
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
    container.innerHTML = `
      <p style="font-size:13px;color:var(--text-muted);padding:8px 0">
        Sin datos de habilidades blandas — los coders aún no completaron el onboarding.
      </p>`;
    return;
  }
  container.innerHTML = SKILL_MAP.map(({ key, label }) => {
    const val = avg[key] || 0;
    const pct = (val / 5) * 100;
    return `
      <div class="skill-item">
        <span class="skill-item-label">${label}</span>
        <div class="skill-bar-track">
          <div class="skill-bar-fill" style="width:${pct}%"></div>
        </div>
        <span class="skill-item-val">${val > 0 ? val.toFixed(1) : '—'}</span>
      </div>`;
  }).join('');
}

/* ── Table ── */
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
      const avgSkill = avgSoftSkills(c);
      return `
      <tr data-id="${c.id}" class="${selectedCoder?.id === c.id ? 'selected' : ''}">
        <td><strong>${c.full_name}</strong></td>
        <td>${
          c.average_score > 0
            ? `<span class="score-pill">${parseFloat(c.average_score).toFixed(1)}</span>`
            : '<span style="color:var(--text-muted)">—</span>'
        }</td>
        <td>${c.current_week > 0 ? `Sem. ${c.current_week}` : '—'}</td>
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
  el('d-email').textContent = c.email;
  el('d-week').textContent =
    c.current_week > 0 ? `Semana ${c.current_week}` : '—';
  el('d-score').textContent =
    c.average_score > 0 ? `${parseFloat(c.average_score).toFixed(1)}%` : '—';
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
        <div class="skill-bar-track">
          <div class="skill-bar-fill" style="width:${pct}%"></div>
        </div>
        <span class="skill-bar-val">${val || '—'}</span>
      </div>`;
  }).join('');
  // Clear feedback area
  el('feedback-text').value = '';
  el('feedback-type').value = '';
  el('feedback-status').className = 'feedback-status hidden';
  el('feedback-status').textContent = '';
}

/* ══════════════════════════════════════
   INTERACTIONS
══════════════════════════════════════ */
/* Filters */
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
/* Feedback */
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
      const res = await fetch(`${API}/tl/feedback`, {
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

/* PDF */
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
    [
      'Estilo de aprendizaje',
      c.learning_style ? cap(c.learning_style) : 'Sin diagnóstico',
    ],
    [
      'Estado de riesgo',
      c.risk_level ? `${cap(c.risk_level)}` : 'Sin flags activos',
    ],
    ['—————————', '—————————'],
    ['Autonomía', c.autonomy ? `${c.autonomy}/5` : '—'],
    ['Gestión tiempo', c.time_management ? `${c.time_management}/5` : '—'],
    ['Resolución', c.problem_solving ? `${c.problem_solving}/5` : '—'],
    ['Comunicación', c.communication ? `${c.communication}/5` : '—'],
    ['Trabajo en equipo', c.teamwork ? `${c.teamwork}/5` : '—'],
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

/* Logout */
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

function avgSoftSkills(c) {
  const vals = [
    c.autonomy,
    c.time_management,
    c.problem_solving,
    c.communication,
    c.teamwork,
  ].filter(Boolean);
  return vals.length
    ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
    : null;
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
// Expose for retry button inline onclick
window.loadDashboard = loadDashboard;
// Upload modal moved to activitiesTL.js
