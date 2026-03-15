/**
 * assets/js/iaTrainer.js
 * AI Trainer — Kairo
 */

import { guards, sessionManager } from '../../src/core/auth/session.js';
import { loadMyAvatar } from '../../src/core/utils/avatarService.js';
import { API_BASE } from '../../src/core/config.js';

const POLL_INTERVAL = 4000;
const POLL_MESSAGES = [
  'Analizando tu diagnóstico...',
  'Identificando tu estilo de aprendizaje...',
  'Construyendo actividades personalizadas...',
  'Aplicando habilidades blandas al plan...',
  'Generando recursos específicos para ti...',
  'Ajustando la dificultad semana a semana...',
  'Casi listo...',
];

/* ── State ── */
let planData = null;
let viewDay = 1;
let viewWeek = 1;
let pollTimer = null;
let pollCount = 0;

/* ── DOM shorthand ── */
const el = (id) => document.getElementById(id);

/* ══════════════════════════════════════
   BOOTSTRAP
══════════════════════════════════════ */
(async function init() {
  applyTheme();
  wireTheme();
  wireLang();
  wireLogout();
  setDate();

  el('loading-overlay').classList.remove('hidden');

  const session = await guards.requireCompleted();
  if (!session) return;

  if (session.user.role !== 'coder') {
    sessionManager.redirectByRole(session.user);
    return;
  }

  loadMyAvatar().catch((err) =>
    console.warn('[AITrainer] Avatar load failed:', err.message)
  );

  el('topbar-name').textContent = session.user.fullName || '—';
  el('loading-overlay').classList.add('hidden');

  await checkPlan();
  wireRequestPlan();

  window.addEventListener('kairo-notification', (e) => {
    const n = e.detail;
    if (n.type === 'feedback' || n.type === 'assignment') {
      checkPlan();
    }
  });
})();

/* ══════════════════════════════════════
   PLAN CHECK
══════════════════════════════════════ */
async function checkPlan() {
  try {
    const res = await fetch(`${API_BASE}/coder/plan`, {
      credentials: 'include',
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

    if (!data.hasPlan) {
      showState('no-plan');
      return;
    }

    planData = data.plan;

    if (!planData.planContent?.weeks?.length) {
      startPolling();
      return;
    }

    showState('active');
    renderActivePlan();
  } catch (err) {
    console.error('[AITrainer] checkPlan:', err);
    showState('no-plan');
  }
}

/* ══════════════════════════════════════
   POLLING
══════════════════════════════════════ */
const POLL_MAX = 30;

function startPolling() {
  showState('generating');
  pollCount = 0;
  clearInterval(pollTimer);

  pollTimer = setInterval(async () => {
    pollCount++;
    el('poll-label').textContent =
      POLL_MESSAGES[pollCount % POLL_MESSAGES.length];

    if (pollCount >= POLL_MAX) {
      clearInterval(pollTimer);
      showNoPlanWithError(
        'La generación tardó más de lo esperado. Intenta de nuevo.'
      );
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/coder/plan`, {
        credentials: 'include',
      });
      const data = await res.json();

      if (!data.hasPlan) return;

      const content = data.plan?.planContent;
      if (content?.status === 'fallback' || !content?.weeks?.length) {
        clearInterval(pollTimer);
        showNoPlanWithError(
          content?.summary ||
            'El servicio de IA no está disponible. Verifica la API key.'
        );
        return;
      }

      clearInterval(pollTimer);
      planData = data.plan;
      showState('active');
      renderActivePlan();
    } catch {
      // silently retry
    }
  }, POLL_INTERVAL);
}

/* ══════════════════════════════════════
   REQUEST NEW PLAN
══════════════════════════════════════ */
function wireRequestPlan() {
  el('btn-request-plan').addEventListener('click', async () => {
    const btn = el('btn-request-plan');
    btn.disabled = true;
    btn.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin"></i> Solicitando...';

    try {
      await fetch(`${API_BASE}/coder/plan/request`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_type: 'interpretive', current_week: 1 }),
      });
      startPolling();
    } catch {
      btn.disabled = false;
      btn.innerHTML =
        '<i class="fa-solid fa-wand-magic-sparkles"></i> Generar mi plan personalizado';
    }
  });
}

/* ══════════════════════════════════════
   RENDER ACTIVE PLAN
   Listeners se registran UNA SOLA VEZ con _listenersWired
══════════════════════════════════════ */
let _listenersWired = false;

function renderActivePlan() {
  const plan = planData.planContent;
  const current = planData.currentDay || 1;

  // Plan header chips
  el('chip-type').textContent =
    plan.plan_type === 'analytical' ? '📊 Analítico' : '🔮 Interpretivo';
  el('chip-style').textContent = `👁 ${plan.learning_style_applied || '—'}`;
  el('chip-skill').textContent = `💡 ${skillLabel(plan.targeted_soft_skill)}`;
  el('plan-summary').textContent = plan.summary || '—';

  renderOverall();
  buildWeekTabs();

  viewDay = current;
  viewWeek = Math.ceil(current / 5);
  renderWeekNav(viewWeek);
  renderDay(viewDay);

  // Registrar listeners solo la primera vez — evita acumulación en recargas
  if (!_listenersWired) {
    el('btn-prev-day').addEventListener('click', () => goToDay(viewDay - 1));
    el('btn-next-day').addEventListener('click', () => goToDay(viewDay + 1));
    el('btn-complete-tech').addEventListener('click', () =>
      markDayComplete(viewDay)
    );
    el('btn-open-exercise').addEventListener('click', () =>
      openExerciseModal(viewDay)
    );
    _listenersWired = true;
  }
}

/* ── Overall progress ── */
function renderOverall() {
  const count = Object.keys(planData.completedDays || {}).length;
  const pct = Math.round((count / 20) * 100);
  el('stat-completed').textContent = count;
  el('overall-fill').style.width = `${pct}%`;
  el('overall-pct').textContent = `${pct}%`;

  if (planData.isComplete)
    el('plan-complete-banner').classList.remove('hidden');
}

/* ── Week tabs ── */
function buildWeekTabs() {
  el('week-tabs').innerHTML = [1, 2, 3, 4]
    .map(
      (w) => `
    <button class="week-tab ${w === viewWeek ? 'active' : ''}"
            data-week="${w}"
            onclick="selectWeek(${w})">
      Semana ${w}
    </button>
  `
    )
    .join('');
}

/* ── Day dots ── */
function renderWeekNav(week) {
  viewWeek = week;

  el('week-tabs')
    .querySelectorAll('.week-tab')
    .forEach((tab) => {
      tab.classList.toggle('active', parseInt(tab.dataset.week) === week);
    });

  const done = planData.completedDays || {};
  const startDay = (week - 1) * 5 + 1;

  el('day-dots').innerHTML = Array.from({ length: 5 }, (_, i) => {
    const d = startDay + i;
    const isDone = !!done[String(d)];
    const isView = d === viewDay;
    let cls = 'day-dot';
    if (isView) cls += ' active';
    else if (isDone) cls += ' done';
    return `<div class="${cls}" title="Día ${d}" onclick="selectDay(${d})">${d}</div>`;
  }).join('');
}

/* ── Performance day helper ── */
function isPerformanceDay(day) {
  return day === 20;
}

/* ══════════════════════════════════════
   RENDER DAY — bug corregido:
   btnExercise declarado con const antes de usarse
══════════════════════════════════════ */
function renderDay(day) {
  viewDay = day;

  const weeks = planData.planContent?.weeks || [];
  const weekIdx = Math.ceil(day / 5) - 1;
  const dayIdx = (day - 1) % 5;
  const weekObj = weeks[weekIdx];
  const dayObj = weekObj?.days?.[dayIdx];

  el('day-number').textContent = `Día ${day}`;
  el('day-week-label').textContent =
    `Semana ${weekIdx + 1} — ${weekObj?.focus || ''}`;

  el('btn-prev-day').disabled = day <= 1;
  el('btn-next-day').disabled = day >= 20;

  // Completed state
  const isDone = !!(planData.completedDays || {})[String(day)];
  el('day-completed-banner').classList.toggle('hidden', !isDone);
  el('card-tech').classList.toggle('completed', isDone);
  el('btn-complete-tech').disabled = isDone;
  el('btn-complete-tech').innerHTML = isDone
    ? '<i class="fa-solid fa-circle-check"></i> Día completado'
    : '<i class="fa-solid fa-check"></i> Marcar día como completado';

  // Performance day banner
  const perfBanner = el('perf-day-banner');
  if (perfBanner) {
    perfBanner.classList.toggle('hidden', !isPerformanceDay(day));
  }

  // FIX: declarar btnExercise correctamente antes de usarla
  const btnExercise = el('btn-open-exercise');
  if (btnExercise) {
    if (isPerformanceDay(day)) {
      btnExercise.innerHTML =
        '<i class="fa-solid fa-graduation-cap"></i> Iniciar simulación de prueba';
      btnExercise.classList.add('btn-exercise-perf');
    } else {
      btnExercise.innerHTML =
        '<i class="fa-solid fa-terminal"></i> Ejercicio del día';
      btnExercise.classList.remove('btn-exercise-perf');
    }
  }

  if (!dayObj) {
    el('tech-title').textContent = 'Actividad no disponible';
    el('tech-desc').textContent = '—';
    el('soft-title').textContent = 'Actividad no disponible';
    el('soft-desc').textContent = '—';
    return;
  }

  // Technical activity
  const tech = dayObj.technical_activity || {};
  el('tech-title').textContent = tech.title || '—';
  el('tech-desc').textContent = tech.description || '—';
  el('tech-duration').textContent = tech.duration_minutes
    ? `${tech.duration_minutes} min`
    : '45 min';

  const diff = (tech.difficulty || 'intermediate').toLowerCase();
  el('tech-difficulty').textContent = capDifficulty(diff);
  el('tech-difficulty').className = `badge-difficulty ${diff}`;

  // Resources
  const chips = (tech.resources || [])
    .map((r) => {
      const url = extractUrl(r);
      const label = url
        ? r.replace(url, '').replace(/[-–:]/g, '').trim() || url
        : null;
      return url
        ? `<a class="resource-btn" href="${url}" target="_blank" rel="noopener noreferrer">
           <i class="fa-solid fa-arrow-up-right-from-square"></i>${label}
         </a>`
        : `<span class="resource-chip"><i class="fa-solid fa-book fa-xs"></i>${r}</span>`;
    })
    .join('');
  el('resources-chips').innerHTML =
    chips || '<span class="resource-chip">Sin recursos adicionales</span>';

  // Soft skill activity
  const soft = dayObj.soft_skill_activity || {};
  el('soft-title').textContent = soft.title || '—';
  el('soft-desc').textContent = soft.description || '—';
  el('soft-duration').textContent = soft.duration_minutes
    ? `${soft.duration_minutes} min`
    : '20 min';
  el('soft-skill-badge').textContent = skillLabel(
    soft.skill || planData.targetedSoftSkill
  );
  el('reflection-text').textContent = soft.reflection_prompt || '—';

  // Sync week nav dots
  renderWeekNav(Math.ceil(day / 5));

  // Search TL resources for this day's topic
  if (tech.title) {
    searchAndRenderResources(tech.title, planData.moduleId);
  }
}

/* ── Mark day complete ── */
async function markDayComplete(day) {
  const btn = el('btn-complete-tech');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

  try {
    const res = await fetch(
      `${API_BASE}/coder/plan/${planData.id}/day/${day}/complete`,
      { method: 'POST', credentials: 'include' }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    planData.completedDays = data.completedDays;
    planData.completedCount = data.completedCount;
    planData.currentDay = data.nextDay || day;
    planData.isComplete = data.isComplete;

    renderOverall();
    renderDay(day);
    buildWeekTabs();
  } catch (err) {
    console.error('[completeDay]', err);
    btn.disabled = false;
    btn.innerHTML =
      '<i class="fa-solid fa-check"></i> Marcar día como completado';
  }
}

/* ── Navigation ── */
function goToDay(d) {
  if (d < 1 || d > 20) return;
  const newWeek = Math.ceil(d / 5);
  if (newWeek !== viewWeek) renderWeekNav(newWeek);
  renderDay(d);
}

// Exponer para onclick= en HTML generado dinámicamente
window.selectWeek = (w) => {
  viewWeek = w;
  buildWeekTabs();
  renderWeekNav(w);
};
window.selectDay = (d) => renderDay(d);

/* ══════════════════════════════════════
   STATE MACHINE
══════════════════════════════════════ */
function showState(state) {
  ['generating', 'no-plan', 'active'].forEach((s) =>
    el(`state-${s}`).classList.add('hidden')
  );
  el(`state-${state}`).classList.remove('hidden');
}

function showNoPlanWithError(reason) {
  showState('no-plan');
  const sub = el('no-plan-sub');
  if (sub) {
    sub.textContent = reason;
    sub.style.color = 'var(--color-error)';
  }
}

/* ══════════════════════════════════════
   THEME
══════════════════════════════════════ */
function applyTheme() {
  const stored = localStorage.getItem('kairo_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', stored);
  syncThemeIcon(stored);
}

function wireTheme() {
  el('btn-theme').addEventListener('click', () => {
    const next =
      document.documentElement.getAttribute('data-theme') === 'dark'
        ? 'light'
        : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('kairo_theme', next);
    syncThemeIcon(next);
  });
}

function syncThemeIcon(theme) {
  el('icon-moon').style.display = theme === 'dark' ? 'block' : 'none';
  el('icon-sun').style.display = theme === 'light' ? 'block' : 'none';
}

/* ══════════════════════════════════════
   UTILS
══════════════════════════════════════ */
function wireLogout() {
  document
    .querySelectorAll('.btn-logout')
    .forEach((btn) =>
      btn.addEventListener('click', () => sessionManager.logout())
    );
}

const LANGS = ['ES', 'EN'];
let langIdx = 0;
function wireLang() {
  el('btn-lang').addEventListener('click', () => {
    langIdx = (langIdx + 1) % LANGS.length;
    el('btn-lang').title = `Idioma: ${LANGS[langIdx]}`;
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

const cap = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '—';

const capDifficulty = (d) =>
  ({
    beginner: 'Principiante',
    intermediate: 'Intermedio',
    advanced: 'Avanzado',
  })[d] || d;

const skillLabel = (key) =>
  ({
    autonomy: 'Autonomía',
    time_management: 'Gestión del tiempo',
    problem_solving: 'Resolución de problemas',
    communication: 'Comunicación',
    teamwork: 'Trabajo en equipo',
  })[key] || cap(key || '—');

const extractUrl = (text) => {
  const match = (text || '').match(/https?:\/\/[^\s"')]+/);
  return match ? match[0] : null;
};

/* ══════════════════════════════════════
   EXERCISE MODAL
══════════════════════════════════════ */
let monacoEditor = null;
let currentExercise = null;
let hintIndex = 0;
let starterCode = '';
let monacoReady = false;

function loadMonaco() {
  return new Promise((resolve) => {
    if (monacoReady) return resolve();
    const script = document.createElement('script');
    script.src =
      'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js';
    script.onload = () => {
      window.require.config({
        paths: {
          vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs',
        },
      });
      window.require(['vs/editor/editor.main'], () => {
        monacoReady = true;
        resolve();
      });
    };
    document.head.appendChild(script);
  });
}

async function openExerciseModal(day) {
  const modal = el('exercise-modal');
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  el('modal-loading').classList.remove('hidden');
  el('modal-content').classList.add('hidden');
  el('hint-box').classList.add('hidden');
  el('solution-box').classList.add('hidden');
  el('btn-submit-exercise').disabled = true;

  el('btn-close-modal').onclick = closeExerciseModal;
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeExerciseModal();
  });

  try {
    const weeks = planData.planContent?.weeks || [];
    const weekIdx = Math.ceil(day / 5) - 1;
    const dayIdx = (day - 1) % 5;
    const dayObj = weeks[weekIdx]?.days?.[dayIdx];
    const tech = dayObj?.technical_activity || {};

    const res = await fetch(`${API_BASE}/coder/exercise/generate`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId: planData.id,
        dayNumber: day,
        weekNumber: weekIdx + 1,
        topic: tech.title || `Día ${day}`,
        description: tech.description || '',
        difficulty: tech.difficulty || 'intermediate',
        moduleName:
          planData.moodleStatusSnapshot?.module_name || 'Bases de Datos',
      }),
    });
    const data = await res.json();

    if (!res.ok || !data.exercise)
      throw new Error(data.error || 'Error al cargar ejercicio');

    currentExercise = data.exercise;
    hintIndex = 0;
    starterCode = currentExercise.starter_code || '';

    renderExerciseModal(currentExercise);
    await loadMonaco();
    mountMonaco(currentExercise.language, starterCode);
    el('btn-submit-exercise').disabled = false;
  } catch (err) {
    console.error('[Exercise Modal]', err);
    el('modal-loading').innerHTML = `
      <i class="fa-solid fa-circle-exclamation" style="font-size:24px;color:var(--color-error)"></i>
      <p style="color:var(--color-error);margin-top:8px">${err.message}</p>
      <button onclick="closeExerciseModal()" class="btn-request-plan" style="margin-top:12px">Cerrar</button>
    `;
  }
}

function renderExerciseModal(ex) {
  const langLabels = {
    sql: 'SQL',
    python: 'Python',
    javascript: 'JavaScript',
    html: 'HTML/CSS',
  };

  el('modal-lang-badge').textContent =
    langLabels[ex.language] || ex.language?.toUpperCase() || 'CODE';
  el('modal-ex-title').textContent = ex.title || 'Ejercicio del día';
  el('modal-difficulty').textContent = capDifficulty(
    ex.difficulty || 'intermediate'
  );
  el('ex-description').textContent = ex.description || '—';
  el('expected-output').textContent = ex.expected_output || '—';

  const hints = ex.hints || [];
  el('btn-show-hint').onclick = () => {
    el('hint-box').classList.toggle('hidden');
    renderHint(hints, hintIndex);
  };
  el('btn-prev-hint').onclick = () => {
    hintIndex = Math.max(0, hintIndex - 1);
    renderHint(hints, hintIndex);
  };
  el('btn-next-hint').onclick = () => {
    hintIndex = Math.min(hints.length - 1, hintIndex + 1);
    renderHint(hints, hintIndex);
  };
  el('btn-show-solution').onclick = () => {
    const box = el('solution-box');
    box.classList.toggle('hidden');
    if (!box.classList.contains('hidden'))
      el('solution-code').textContent =
        ex.solution || 'Sin solución disponible.';
  };
  el('btn-reset-code').onclick = () => {
    if (monacoEditor) monacoEditor.setValue(starterCode);
  };
  el('btn-submit-exercise').onclick = () => submitSolution(ex.id);

  el('modal-loading').classList.add('hidden');
  el('modal-content').classList.remove('hidden');
}

function renderHint(hints, idx) {
  if (!hints.length) return;
  el('hint-text').textContent = hints[idx] || '—';
  el('hint-counter').textContent = `${idx + 1} / ${hints.length}`;
  el('btn-prev-hint').disabled = idx === 0;
  el('btn-next-hint').disabled = idx >= hints.length - 1;
}

function mountMonaco(language, code) {
  if (monacoEditor) {
    monacoEditor.dispose();
    monacoEditor = null;
  }

  const langMap = {
    sql: 'sql',
    python: 'python',
    javascript: 'javascript',
    html: 'html',
  };
  const monacoLang = langMap[language] || 'plaintext';

  monacoEditor = window.monaco.editor.create(el('monaco-editor'), {
    value: code,
    language: monacoLang,
    theme: 'vs-dark',
    fontSize: 13,
    fontFamily: "'Fira Code', 'Cascadia Code', monospace",
    fontLigatures: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    lineNumbers: 'on',
    padding: { top: 14, bottom: 14 },
    automaticLayout: true,
    wordWrap: 'on',
    tabSize: 2,
  });
}

async function submitSolution(exerciseId) {
  if (!monacoEditor || !exerciseId) return;

  const btn = el('btn-submit-exercise');
  const code = monacoEditor.getValue().trim();

  if (!code) {
    btn.innerHTML =
      '<i class="fa-solid fa-exclamation"></i> Escribe algo primero';
    setTimeout(() => {
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar solución';
    }, 2000);
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';

  try {
    const res = await fetch(`${API_BASE}/coder/exercise/${exerciseId}/submit`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();

    if (data.success) {
      btn.innerHTML =
        '<i class="fa-solid fa-circle-check"></i> ¡Solución enviada!';
      btn.style.background = 'linear-gradient(135deg, #065f46, #10b981)';
      setTimeout(closeExerciseModal, 2000);
    } else {
      throw new Error(data.error);
    }
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar solución';
    console.error('[submitSolution]', err);
  }
}

function closeExerciseModal() {
  el('exercise-modal').classList.add('hidden');
  document.body.style.overflow = '';
  if (monacoEditor) {
    monacoEditor.dispose();
    monacoEditor = null;
  }
  el('solution-box').classList.add('hidden');
  el('hint-box').classList.add('hidden');
  const btn = el('btn-submit-exercise');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar solución';
  btn.style.background = '';
}

window.closeExerciseModal = closeExerciseModal;

/* ══════════════════════════════════════
   RAG — RECURSOS DEL TL
══════════════════════════════════════ */
async function searchAndRenderResources(topic, moduleId) {
  const cardsEl = el('resources-cards');
  const emptyEl = el('resources-empty');
  const loadingEl = el('resources-loading-badge');

  cardsEl.innerHTML = '';
  emptyEl.classList.add('hidden');
  loadingEl.classList.remove('hidden');

  try {
    const res = await fetch(`${API_BASE}/coder/resources/search`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, moduleId, limit: 3 }),
    });
    const data = await res.json();

    loadingEl.classList.add('hidden');

    if (!data.resources?.length) {
      emptyEl.classList.remove('hidden');
      return;
    }

    cardsEl.innerHTML = data.resources
      .map(
        (r) => `
      <div class="resource-card">
        <div class="resource-card-icon">
          <i class="fa-solid fa-file-pdf"></i>
        </div>
        <div class="resource-card-body">
          <p class="resource-card-title">${r.title}</p>
          <p class="resource-card-preview">${r.preview_text || r.file_name}</p>
          <div class="resource-card-meta">
            <span class="resource-similarity">${Math.round((r.similarity || 0) * 100)}% relevante</span>
            <span style="font-size:11px;color:var(--text-muted)">${r.file_name}</span>
          </div>
        </div>
        ${
          r.download_url
            ? `<a class="btn-download-resource" href="${r.download_url}" target="_blank" rel="noopener noreferrer">
               <i class="fa-solid fa-download"></i> Descargar
             </a>`
            : `<span style="font-size:11px;color:var(--text-muted);flex-shrink:0">Sin enlace</span>`
        }
      </div>
    `
      )
      .join('');
  } catch {
    loadingEl.classList.add('hidden');
    emptyEl.classList.remove('hidden');
  }
}
