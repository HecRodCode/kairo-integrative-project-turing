/**
 * assets/js/dashboardCoder.js
 * Dashboard del Coder — Kairo
 *
 * Datos reales del endpoint GET /api/coder/dashboard.
 * Sin mock data. Sin spinners de carga — skeleton shimmer implícito en CSS.
 */
import { guards, sessionManager } from '../../src/core/auth/session.js';
const API = 'http://localhost:3000/api';
/* ── State ── */
let dashData = null;
/* ── Shorthand ── */
const el = (id) => document.getElementById(id);

/* ══════════════════════════════════════
   BOOTSTRAP
══════════════════════════════════════ */
(async function init() {
  wireLang();
  wireNotifToggle();
  wireLogout();
  setDate();
  // requireCompleted: verifica sesión activa + firstLogin === false.
  const session = await guards.requireCompleted();
  if (!session) return;
  if (session.user.role !== 'coder') {
    sessionManager.redirectByRole(session.user);
    return;
  }
  await loadDashboard();
})();

/* ══════════════════════════════════════
   LOAD
══════════════════════════════════════ */
async function loadDashboard() {
  try {
    const res = await fetch(`${API}/coder/dashboard`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    dashData = data;
    renderAll(data);
  } catch (err) {
    console.error('[Dashboard Coder]', err);
    el('error-banner').classList.remove('hidden');
    el('error-msg').textContent =
      err.message || 'No se pudo conectar con el servidor.';
  } finally {
  }
}

/* ══════════════════════════════════════
   RENDER
══════════════════════════════════════ */
function renderAll(d) {
  renderUser(d.user, d.activePlan, d.riskFlags);
  renderTopbar(d.user, d.progress);
  renderStats(d.user, d.progress);
  renderModuleProgress(d.progress, d.user);
  renderSoftSkills(d.softSkills);
  renderScoreRing(d.softSkills);
  renderPerformanceTests(d.performanceTests);
  renderFeedback(d.notifications);
  renderStrugglingTopics(d.progress);
  renderNotifications(d.notifications);
}

/* ── User / welcome ── */
function renderUser(user, plan, riskFlags) {
  if (!user) return;
  const firstName = user.fullName?.split(' ')[0] || user.fullName || '—';
  el('welcome-name').textContent = user.fullName;
  el('topbar-name').textContent = firstName;
  el('clan-badge').textContent = cap(user.clan || '—');
  // Plan badge
  if (plan) {
    el('plan-badge').classList.remove('hidden');
  }
  // Risk alert
  const activeRisks = (riskFlags || []).filter(
    (r) => r.level === 'high' || r.level === 'critical'
  );
  if (activeRisks.length > 0) {
    el('risk-alert').classList.remove('hidden');
    el('risk-msg').textContent =
      activeRisks[0].reason ||
      `Flag de riesgo activo (${activeRisks[0].level})`;
  }
}

/* ── Topbar module info ── */
function renderTopbar(user, progress) {
  el('module-pill').textContent = user?.moduleName
    ? truncate(user.moduleName, 22)
    : '—';
  const week = progress?.currentWeek ?? 1;
  el('topbar-week').textContent = user?.moduleTotalWeeks
    ? `Semana ${week} de ${user.moduleTotalWeeks}`
    : `Semana ${week}`;
}

/* ── Stats row ── */
function renderStats(user, progress) {
  el('st-module').textContent = user?.moduleName
    ? truncate(user.moduleName, 14)
    : '—';
  el('st-week').textContent = `Semana ${progress?.currentWeek ?? 1}`;
  el('st-score').textContent =
    progress?.averageScore != null
      ? `${parseFloat(progress.averageScore).toFixed(1)}`
      : 'Sin datos';
  el('st-weeks-done').textContent =
    progress?.weeksCompletedCount != null
      ? `${progress.weeksCompletedCount}`
      : '0';
}

/* ── Module progress dots ── */
function renderModuleProgress(progress, user) {
  const total = user?.moduleTotalWeeks || 0;
  const current = progress?.currentWeek ?? 1;
  const done = progress?.weeksCompletedCount || 0;
  el('progress-meta').textContent =
    total > 0 ? `Semana ${current} de ${total}` : '—';
  if (!total) {
    el('week-dots').innerHTML =
      '<span style="font-size:12px;color:var(--text-muted)">Sin datos de módulo</span>';
    el('progress-percent').textContent = '—';
    return;
  }
  const pct = Math.round((done / total) * 100);
  el('progress-percent').textContent = `${pct}% completado`;
  el('week-dots').innerHTML = Array.from({ length: total }, (_, i) => {
    const weekNum = i + 1;
    let cls = 'week-dot';
    if (weekNum < current) cls += ' done';
    if (weekNum === current) cls += ' current';
    return `<div class="${cls}" title="Semana ${weekNum}"></div>`;
  }).join('');
}

/* ── Score ring ── */
function renderScoreRing(softSkills) {
  if (!softSkills?.average) {
    el('ring-value').textContent = '—';
    return;
  }
  const avg = softSkills.average; // 1-5
  const pct = ((avg - 1) / 4) * 100; // normalize 1-5 to 0-100%
  el('ring-value').textContent = avg.toFixed(1);
  // Animate the conic gradient
  requestAnimationFrame(() => {
    setTimeout(() => {
      el('score-ring').style.background =
        `conic-gradient(var(--accent) ${pct}%, var(--border-glass) ${pct}%)`;
    }, 200);
  });
}

/* ── Learning style in aside ── */
const STYLE_DESCRIPTIONS = {
  visual: 'Aprendes mejor con diagramas, videos y elementos visuales.',
  kinesthetic: 'Aprendes mejor construyendo y practicando con código real.',
  reading: 'Aprendes mejor leyendo documentación y escribiendo notas.',
  auditory: 'Aprendes mejor escuchando y explicando conceptos en voz alta.',
  mixed: 'Tu aprendizaje es versátil — combinas múltiples enfoques.',
};

/* ── Soft skills bars ── */
const SKILL_DEFS = [
  { key: 'autonomy', label: 'Autonomía' },
  { key: 'timeManagement', label: 'Gestión del tiempo' },
  { key: 'problemSolving', label: 'Resolución de problemas' },
  { key: 'communication', label: 'Comunicación' },
  { key: 'teamwork', label: 'Trabajo en equipo' },
];

function renderSoftSkills(ss) {
  if (!ss) {
    el('skills-list').innerHTML =
      '<p class="empty-state">Completa el onboarding para ver tus habilidades blandas.</p>';
    return;
  }
  const scores = {
    autonomy: ss.autonomy,
    timeManagement: ss.timeManagement,
    problemSolving: ss.problemSolving,
    communication: ss.communication,
    teamwork: ss.teamwork,
  };
  const weakestKey = Object.entries(scores).reduce((a, b) =>
    a[1] < b[1] ? a : b
  )[0];
  el('skills-list').innerHTML = SKILL_DEFS.map(({ key, label }) => {
    const val = scores[key] || 0;
    const pct = (val / 5) * 100;
    const isWeak = key === weakestKey;
    return `
      <div class="skill-row">
        <div class="skill-row-head">
          <span class="skill-row-label">
            ${label}
            ${isWeak ? '<span class="skill-weak-tag">Más débil</span>' : ''}
          </span>
          <span class="skill-score">${val}<span style="font-size:10px;color:var(--text-muted)">/5</span></span>
        </div>
        <div class="skill-track">
          <div class="skill-fill ${isWeak ? 'weak' : ''}"
               style="width:0"
               data-target="${pct}">
          </div>
        </div>
      </div>`;
  }).join('');
  // Animate bars in after render
  requestAnimationFrame(() => {
    setTimeout(() => {
      el('skills-list')
        .querySelectorAll('.skill-fill')
        .forEach((bar) => {
          bar.style.width = bar.dataset.target + '%';
        });
    }, 150);
  });
  // Note under bars
  el('skills-note').textContent =
    `Resultados del diagnóstico inicial · ${formatDate(ss.assessedAt)}`;
  // Style block in ring card
  const style = ss.learningStyle || 'mixed';
  el('style-value').textContent = cap(style);
  const desc = STYLE_DESCRIPTIONS[style] || '';
  if (desc) {
    const p = document.createElement('p');
    p.style.cssText =
      'font-size:11px;color:var(--text-muted);margin:6px 0 0;line-height:1.5';
    p.textContent = desc;
    el('style-block').appendChild(p);
  }
}

/* ── Performance tests ── */
function renderPerformanceTests(tests) {
  if (!tests || tests.length === 0) return;
  el('perf-list').innerHTML = tests
    .map((t) => {
      const score = t.score != null ? Math.round(t.score) : '—';
      const status = (t.status || 'pending').toLowerCase();
      const label =
        {
          approved: 'Aprobado',
          failed: 'Reprobado',
          pending: 'Pendiente',
          're-eval': 'Re-eval',
        }[status] || status;
      return `
      <div class="perf-item">
        <div class="perf-score ${status}">${score}</div>
        <div class="perf-info">
          <p class="perf-module">${t.moduleName || '—'}</p>
          <p class="perf-date">${formatDate(t.takenAt)}</p>
        </div>
        <span class="perf-status ${status}">${label}</span>
      </div>`;
    })
    .join('');
}
/* ── TL Feedback ── */
function renderFeedback(notifications) {
  const items = notifications?.items || [];
  if (items.length === 0) return;
  el('feedback-list').innerHTML = items
    .map((f) => {
      const typeLabel =
        {
          encouragement: 'Motivación',
          improvement: 'Área de mejora',
          achievement: 'Logro destacado',
          warning: 'Advertencia',
        }[f.type] ||
        f.type ||
        'Feedback';
      return `
      <div class="feedback-item">
        <div class="feedback-meta">
          <span class="feedback-type-tag ${f.type || ''}">${typeLabel}</span>
          <span class="feedback-tl-name">De: ${f.tlName || 'Tu TL'}</span>
        </div>
        <p class="feedback-text">${f.text}</p>
      </div>`;
    })
    .join('');
}
/* ── Struggling topics ── */
function renderStrugglingTopics(progress) {
  const topics = progress?.strugglingTopics || [];
  if (!topics.length) return;
  el('struggling-card').classList.remove('hidden');
  el('struggling-list').innerHTML = topics
    .map(
      (t) =>
        `<span class="struggling-chip"><i class="fa-solid fa-circle-exclamation"></i>${t}</span>`
    )
    .join('');
}
/* ── Notification dropdown ── */
function renderNotifications(notifications) {
  const items = notifications?.items || [];
  const unread = notifications?.unread || 0;
  if (unread > 0) {
    el('notif-dot').classList.remove('hidden');
  }
  if (items.length === 0) return;
  el('notif-list').innerHTML = items
    .map((f) => {
      const typeLabel =
        {
          encouragement: '💚 Motivación',
          improvement: '🟡 Área de mejora',
          achievement: '💜 Logro',
          warning: '🔴 Advertencia',
        }[f.type] || '📨 Feedback';
      return `
      <div class="notif-item">
        <p class="notif-tl">${typeLabel} · ${f.tlName || 'Tu TL'}</p>
        <p class="notif-text">${truncate(f.text, 80)}</p>
        <p class="notif-time">${formatDate(f.createdAt)}</p>
      </div>`;
    })
    .join('');
}
/* ══════════════════════════════════════
   INTERACTIONS
══════════════════════════════════════ */
function wireNotifToggle() {
  el('btn-notif').addEventListener('click', (e) => {
    e.stopPropagation();
    el('notif-dropdown').classList.toggle('hidden');
  });
  document.addEventListener('click', () => {
    el('notif-dropdown').classList.add('hidden');
  });
}
function wireLogout() {
  el('btn-logout').addEventListener('click', () => sessionManager.logout());
}
/* Language toggle — cycles es/en (UI label only for now) */
const LANGS = ['ES', 'EN'];
let langIdx = 0;
function wireLang() {
  el('btn-lang').addEventListener('click', () => {
    langIdx = (langIdx + 1) % LANGS.length;
    el('btn-lang').title = `Idioma: ${LANGS[langIdx]}`;
    // Full i18n implementation in i18n.js
  });
}
/* ══════════════════════════════════════
   UTILS
══════════════════════════════════════ */
function cap(str) {
  if (!str) return '—';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '...' : str;
}
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
function setDate() {
  el('topbar-date').textContent = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
function styleIcon(style) {
  const icons = {
    visual: 'fa-eye',
    kinesthetic: 'fa-hand',
    reading: 'fa-book-open',
    auditory: 'fa-headphones',
    mixed: 'fa-shuffle',
  };
  const icon = document.createElement('i');
  icon.className = `fa-solid ${icons[(style || 'mixed').toLowerCase()] || 'fa-star'} fa-xs`;
  return icon;
}
