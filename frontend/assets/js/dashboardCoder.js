/**
 * assets/js/dashboardCoder.js
 * Dashboard del Coder — Kairo
 */

import { guards, sessionManager } from '../../src/core/auth/session.js';
import { loadMyAvatar } from '../../src/core/utils/avatarService.js';
import { API_BASE } from '../../src/core/config.js';

/* ── Helpers de DOM ── */
const el = (id) => document.getElementById(id);

/* ── Loading overlay ── */
const overlay = {
  show() {
    el('loading-overlay')?.classList.remove('hidden');
  },
  hide() {
    setTimeout(() => el('loading-overlay')?.classList.add('hidden'), 150);
  },
};

let dashData = null;

/* BOOTSTRAP */
(async function init() {
  overlay.show();

  wireLang();
  wireLogout();
  wireTheme();
  setDate();

  const session = await guards.requireCompleted();
  if (!session) return;

  if (session.user.role !== 'coder') {
    sessionManager.redirectByRole(session.user);
    return;
  }

  loadMyAvatar().catch((err) =>
    console.warn('[Dashboard] Avatar load failed:', err.message)
  );

  await loadDashboard();

  window.addEventListener('kairo-notification', (e) => {
    const n = e.detail;
    if (n.type === 'feedback' || n.type === 'assignment') {
      loadDashboard();
    }
  });
})();

/* LOAD */
async function loadDashboard() {
  overlay.show();
  try {
    const res = await fetch(`${API_BASE}/coder/dashboard`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    dashData = data;
    renderAll(data);
    el('error-banner')?.classList.add('hidden');
  } catch (err) {
    console.error('[Dashboard Coder]', err);
    el('error-banner')?.classList.remove('hidden');
    if (el('error-msg')) {
      el('error-msg').textContent =
        err.message || 'No se pudo conectar con el servidor.';
    }
  } finally {
    overlay.hide();
  }
}

window.loadDashboard = loadDashboard;

/* RENDER PRINCIPAL */
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
  renderNotificationBadge(d.notifications);
}

/* ── User / Welcome card ── */
function renderUser(user, plan, riskFlags) {
  if (!user) return;

  if (el('welcome-name')) el('welcome-name').textContent = user.fullName || '—';
  if (el('topbar-name')) el('topbar-name').textContent = user.fullName || '—';
  if (el('clan-badge')) el('clan-badge').textContent = cap(user.clanId || '—');

  if (plan && el('plan-badge')) {
    el('plan-badge').classList.remove('hidden');
  }

  const activeRisks = (riskFlags || []).filter(
    (r) => r.level === 'high' || r.level === 'critical'
  );
  if (activeRisks.length > 0 && el('risk-alert')) {
    el('risk-alert').classList.remove('hidden');
    if (el('risk-msg')) {
      el('risk-msg').textContent =
        activeRisks[0].reason ||
        `Flag de riesgo activo (${activeRisks[0].level})`;
    }
  }

  if (el('kairo-score-val')) {
    el('kairo-score-val').textContent = `${user.kairoScore ?? 50} pts`;
  }
}

/* ── Topbar ── */
function renderTopbar(user, progress) {
  if (el('module-pill')) {
    el('module-pill').textContent = user?.moduleName
      ? truncate(user.moduleName, 22)
      : '—';
  }
  const week = progress?.currentWeek ?? 1;
  if (el('topbar-week')) {
    el('topbar-week').textContent = user?.moduleTotalWeeks
      ? `Semana ${week} de ${user.moduleTotalWeeks}`
      : `Semana ${week}`;
  }
}

/* ── Stats cards ── */
function renderStats(user, progress) {
  if (el('st-module'))
    el('st-module').textContent = user?.moduleName
      ? truncate(user.moduleName, 14)
      : '—';
  if (el('st-week'))
    el('st-week').textContent = `Semana ${progress?.currentWeek ?? 1}`;
  if (el('st-score'))
    el('st-score').textContent =
      progress?.averageScore != null
        ? parseFloat(progress.averageScore).toFixed(1)
        : '—';
  if (el('st-weeks-done'))
    el('st-weeks-done').textContent =
      progress?.weeksCompletedCount != null
        ? `${progress.weeksCompletedCount}`
        : '0';
  // Kairo Score en stat card
  if (el('st-kairo-score'))
    el('st-kairo-score').textContent = `${user?.kairoScore ?? 50} pts`;
}

/* ── Module progress dots ── */
function renderModuleProgress(progress, user) {
  const total = user?.moduleTotalWeeks || 0;
  const current = progress?.currentWeek ?? 1;
  const done = progress?.weeksCompletedCount || 0;

  if (el('progress-meta')) {
    el('progress-meta').textContent =
      total > 0 ? `Semana ${current} de ${total}` : '—';
  }

  if (!total) {
    if (el('week-dots')) {
      el('week-dots').innerHTML =
        '<span style="font-size:12px;color:var(--text-muted)">Sin datos de módulo</span>';
    }
    if (el('progress-percent')) el('progress-percent').textContent = '—';
    return;
  }

  const pct = Math.round((done / total) * 100);
  if (el('progress-percent'))
    el('progress-percent').textContent = `${pct}% completado`;

  if (el('week-dots')) {
    el('week-dots').innerHTML = Array.from({ length: total }, (_, i) => {
      const weekNum = i + 1;
      const cls = [
        'week-dot',
        weekNum < current ? 'done' : '',
        weekNum === current ? 'current' : '',
      ]
        .filter(Boolean)
        .join(' ');
      return `<div class="${cls}" title="Semana ${weekNum}"></div>`;
    }).join('');
  }
}

/* ── Score ring ── */
function renderScoreRing(softSkills) {
  if (!softSkills?.average) {
    if (el('ring-value')) el('ring-value').textContent = '—';
    return;
  }
  const avg = softSkills.average;
  const pct = ((avg - 1) / 4) * 100;
  if (el('ring-value')) el('ring-value').textContent = avg.toFixed(1);
  requestAnimationFrame(() => {
    setTimeout(() => {
      if (el('score-ring')) {
        el('score-ring').style.background =
          `conic-gradient(var(--accent) ${pct}%, var(--border-glass) ${pct}%)`;
      }
    }, 200);
  });
}

/* ── Soft skills bars ── */
const STYLE_DESCRIPTIONS = {
  visual: 'Aprendes mejor con diagramas, videos y elementos visuales.',
  kinesthetic: 'Aprendes mejor construyendo y practicando con código real.',
  reading: 'Aprendes mejor leyendo documentación y escribiendo notas.',
  auditory: 'Aprendes mejor escuchando y explicando conceptos en voz alta.',
  mixed: 'Tu aprendizaje es versátil — combinas múltiples enfoques.',
};

const SKILL_DEFS = [
  { key: 'autonomy', label: 'Autonomía' },
  { key: 'timeManagement', label: 'Gestión del tiempo' },
  { key: 'problemSolving', label: 'Resolución de problemas' },
  { key: 'communication', label: 'Comunicación' },
  { key: 'teamwork', label: 'Trabajo en equipo' },
];

function renderSoftSkills(ss) {
  if (!ss) {
    if (el('skills-list')) {
      el('skills-list').innerHTML =
        '<p class="empty-state">Completa el onboarding para ver tus habilidades blandas.</p>';
    }
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

  if (el('skills-list')) {
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
            <div class="skill-fill ${isWeak ? 'weak' : ''}" style="width:0" data-target="${pct}"></div>
          </div>
        </div>`;
    }).join('');

    requestAnimationFrame(() => {
      setTimeout(() => {
        el('skills-list')
          ?.querySelectorAll('.skill-fill')
          .forEach((bar) => {
            bar.style.width = bar.dataset.target + '%';
          });
      }, 150);
    });
  }

  if (el('skills-note')) {
    el('skills-note').textContent =
      `Resultados del diagnóstico inicial · ${formatDate(ss.assessedAt)}`;
  }

  const style = ss.learningStyle || 'mixed';
  if (el('style-value')) el('style-value').textContent = cap(style);

  const desc = STYLE_DESCRIPTIONS[style];
  if (desc && el('style-block')) {
    const existing = el('style-block').querySelector('.style-desc');
    if (!existing) {
      const p = document.createElement('p');
      p.className = 'style-desc';
      p.style.cssText =
        'font-size:11px;color:var(--text-muted);margin:6px 0 0;line-height:1.5';
      p.textContent = desc;
      el('style-block').appendChild(p);
    }
  }
}

/* ── Performance tests ── */
function renderPerformanceTests(tests) {
  if (!tests?.length || !el('perf-list')) return;

  const STATUS_LABEL = {
    approved: 'Aprobado',
    failed: 'Reprobado',
    pending: 'Pendiente',
    're-eval': 'Re-eval',
  };

  el('perf-list').innerHTML = tests
    .map((t) => {
      const score = t.score != null ? Math.round(t.score) : '—';
      const status = (t.status || 'pending').toLowerCase();
      const label = STATUS_LABEL[status] || status;
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

/* ── Feedback TL ── */
function renderFeedback(notifications) {
  const items = notifications?.items || [];
  if (!items.length || !el('feedback-list')) return;

  const TYPE_LABEL = {
    encouragement: 'Motivación',
    improvement: 'Área de mejora',
    achievement: 'Logro destacado',
    warning: 'Advertencia',
  };

  el('feedback-list').innerHTML = items
    .map((f) => {
      const typeLabel = TYPE_LABEL[f.type] || f.type || 'Feedback';
      return `
      <div class="feedback-item ${f.isRead ? 'read' : 'unread'}" id="feedback-row-${f.id}">
        <div class="feedback-meta">
          <span class="feedback-type-tag ${f.type || ''}">${typeLabel}</span>
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="feedback-tl-name">De: ${f.tlName || 'Tu TL'}</span>
            ${
              !f.isRead
                ? `<button class="btn-mark-read" data-id="${f.id}" onclick="markAsRead('${f.id}')">
                   Marcar leído
                 </button>`
                : ''
            }
          </div>
        </div>
        <p class="feedback-text">${f.text}</p>
        <span class="feedback-date">${formatDate(f.createdAt)}</span>
      </div>`;
    })
    .join('');
}

/* ── Notification badge ── */
function renderNotificationBadge(notifications) {
  const unread = notifications?.unread || 0;
  const dot = el('notif-dot');
  if (!dot) return;
  if (unread > 0) {
    dot.classList.remove('hidden');
    dot.textContent = unread > 9 ? '9+' : String(unread);
  } else {
    dot.classList.add('hidden');
  }
}

/* ── Struggling topics ── */
function renderStrugglingTopics(progress) {
  const topics = progress?.strugglingTopics || [];
  if (!topics.length || !el('struggling-card')) return;
  el('struggling-card').classList.remove('hidden');
  if (el('struggling-list')) {
    el('struggling-list').innerHTML = topics
      .map(
        (t) =>
          `<span class="struggling-chip">
        <i class="fa-solid fa-circle-exclamation"></i>${t}
      </span>`
      )
      .join('');
  }
}

/* ── markAsRead global  ── */
window.markAsRead = async (id) => {
  try {
    const res = await fetch(`${API_BASE}/coder/feedback/${id}/read`, {
      method: 'PATCH',
      credentials: 'include',
    });
    if (res.ok) {
      const row = el(`feedback-row-${id}`);
      if (row) {
        row.classList.replace('unread', 'read');
        row.querySelector('.btn-mark-read')?.remove();
      }
    } else {
      console.warn('[markAsRead] Server responded:', res.status);
    }
  } catch (err) {
    console.error('[markAsRead]', err.message);
  }
};

/* INTERACTIONS */
function wireLogout() {
  document.querySelectorAll('.btn-logout').forEach((btn) =>
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      sessionManager.logout();
    })
  );
}

function wireLang() {
  const btn = el('btn-lang');
  if (!btn) return;
  const LANGS = ['ES', 'EN'];
  let langIdx = 0;
  btn.addEventListener('click', () => {
    langIdx = (langIdx + 1) % LANGS.length;
    btn.title = `Idioma: ${LANGS[langIdx]}`;
    // Aquí puedes disparar window.dispatchEvent(new CustomEvent('kairo:langchange'))
    // si el sistema i18n lo necesita
  });
}

function wireTheme() {
  const btn = el('btn-theme');
  const moon = el('icon-moon');
  const sun = el('icon-sun');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const isDark =
      document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute(
      'data-theme',
      isDark ? 'light' : 'dark'
    );
    if (moon) moon.style.display = isDark ? 'none' : '';
    if (sun) sun.style.display = isDark ? '' : 'none';
  });
}

/* UTILS */
const cap = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '—';
const truncate = (str, max) =>
  str?.length > max ? str.slice(0, max) + '...' : str || '';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function setDate() {
  if (el('topbar-date')) {
    el('topbar-date').textContent = new Date().toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
