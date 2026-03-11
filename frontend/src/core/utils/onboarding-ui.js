/**
 * src/core/utils/onboarding-ui.js
 * Onboarding controller.
 * - Guards the page (must be logged in + firstLogin = true)
 * - Detects OAuth users (clan = null) and asks for clan before finishing
 * - POSTs results to the backend on completion
 */

import { ONBOARDING_DATA } from '../../services/onboarding-data.js';
import { authService } from '../auth/auth-service.js';
import { guards } from '../auth/session.js';

/* ── Language helpers ── */
const getLang = () => localStorage.getItem('kairo-lang') || 'es';
const t = (obj) => (typeof obj === 'object' ? (obj[getLang()] ?? obj.es) : obj);

/* ── Flat question list ── */
const ALL_QUESTIONS = ONBOARDING_DATA.flatMap((block) =>
  block.questions.map((q) => ({
    ...q,
    blockId: block.blockId,
    blockTitle: block.title,
  }))
);
const TOTAL = ALL_QUESTIONS.length;

/* CONTROLLER */
const onboardingController = {
  currentIdx: 0,
  userAnswers: [],
  finished: false,
  currentUser: null, // set by init() after guard
  inClanSelection: false,
  selectedClan: null,

  async init() {
    /* Guard: must be authenticated and have firstLogin = true */
    const session = await guards.requireOnboarding();
    if (!session) return; // redirected by guard

    /* Fetch full user to check if clan is null (OAuth user) */
    try {
      const res = await authService.getMe();
      const data = await res.json();
      this.currentUser = data.user || null;
    } catch {
      this.currentUser = null;
    }

    this._render();

    window.addEventListener('kairo:langchange', () => {
      if (this.finished) {
        this._renderFinalSuccess();
        return;
      }

      if (this.inClanSelection) {
        this._showClanModal();
        return;
      }

      this._renderStepper(this._current().blockId);
      this._renderQuestion(this._current());
      this._updateProgress();
    });
  },

  _current() {
    return ALL_QUESTIONS[this.currentIdx];
  },

  /* ── Full render ── */
  _render() {
    const q = this._current();
    this._renderStepper(q.blockId);
    this._renderQuestion(q);
    this._updateProgress();
    const btn = document.getElementById('btnBack');
    if (btn) btn.disabled = this.currentIdx === 0;
  },

  /* ── Stepper ── */
  _renderStepper(activeBlockId) {
    const el = document.getElementById('stepper');
    if (!el) return;

    el.innerHTML = ONBOARDING_DATA.map((block) => {
      const isActive = block.blockId === activeBlockId;
      const isCompleted =
        !isActive &&
        block.questions.every((q) =>
          this.userAnswers.some((a) => a.questionId === q.id)
        );
      const label = t(block.title);
      const cls = [
        'tab-item',
        isActive ? 'active' : '',
        isCompleted ? 'completed' : '',
      ]
        .join(' ')
        .trim();
      return `<div class="${cls}" title="${label}">${isCompleted ? '✓ ' : ''}${label}</div>`;
    }).join('');
  },

  /* ── Question ── */
  _renderQuestion(q) {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    set('block-badge', `B${q.blockId}`);
    set('block-title', t(q.blockTitle));
    set('question-text', t(q.text));
    set('qCurrent', String(this.currentIdx + 1).padStart(2, '0'));
    set('qBlock', `B${q.blockId}`);

    const container = document.getElementById('options-container');
    if (!container) return;
    container.innerHTML = '';

    const keys = ['A', 'B', 'C', 'D'];
    const current = this.userAnswers.find((a) => a.questionId === q.id);

    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className =
        'option-btn' + (current?.optionId === opt.id ? ' selected' : '');
      btn.dataset.optionId = opt.id;
      btn.type = 'button';
      btn.innerHTML = `<span class="option-key">${keys[i]}</span><span>${t(opt.text)}</span>`;
      btn.addEventListener('click', () =>
        this._answer(q.id, opt.id, opt.score)
      );
      container.appendChild(btn);
    });
  },

  /* ── Answer ── */
  _answer(questionId, optionId, score) {
    const idx = this.userAnswers.findIndex((a) => a.questionId === questionId);
    const entry = { questionId, optionId, score };
    if (idx > -1) this.userAnswers[idx] = entry;
    else this.userAnswers.push(entry);

    document
      .querySelectorAll('#options-container .option-btn')
      .forEach((b) =>
        b.classList.toggle('selected', b.dataset.optionId === optionId)
      );
    setTimeout(() => this._advance(), 320);
  },

  /* ── Advance ── */
  _advance() {
    const card = document.getElementById('question-card');
    if (!card) return;
    card.classList.add('fade-out');
    setTimeout(() => {
      card.classList.remove('fade-out');
      if (this.currentIdx < TOTAL - 1) {
        this.currentIdx++;
        this._render();
      } else {
        this._beforeFinish();
      }
    }, 220);
  },

  /* ── Go back ── */
  goBack() {
    if (this.currentIdx <= 0) return;
    const card = document.getElementById('question-card');
    if (card) card.classList.add('fade-out');
    setTimeout(() => {
      if (card) card.classList.remove('fade-out');
      this.currentIdx--;
      this._render();
    }, 220);
  },

  /* ── Progress ── */
  _updateProgress() {
    const q = this._current();
    const pct = Math.round(((this.currentIdx + 1) / TOTAL) * 100);
    const isEn = getLang() === 'en';
    const fill = document.getElementById('progress-fill');
    const navPct = document.getElementById('navPct');
    const navStep = document.getElementById('navStep');
    if (fill) fill.style.width = `${pct}%`;
    if (navPct) navPct.textContent = `${pct}%`;
    if (navStep) {
      const label = isEn ? 'Question' : 'Pregunta';
      const separator = isEn ? 'of' : 'de';
      navStep.textContent = `B${q.blockId} · ${label} ${this.currentIdx + 1} ${separator} ${TOTAL}`;
    }
  },

  /* PRE-FINISH: ask clan if OAuth user (clan = null) */
  _beforeFinish() {
    const needsClan = !this.currentUser?.clan;

    if (needsClan) {
      this.inClanSelection = true;
      this._showClanModal();
    } else {
      this._finish(null);
    }
  },

  _showClanModal() {
    const isEn = getLang() === 'en';
    const card = document.getElementById('question-card');
    if (!card) return;

    const previousSelection = this.selectedClan;

    const clans = [
      'hamilton',
      'thompson',
      'turing',
      'mccarthy',
      'ritchie',
      'tesla',
    ];
    const opts = clans
      .map(
        (c) =>
          `<button class="option-btn clan-option" data-clan="${c}" type="button">
        <span class="option-key">${c[0].toUpperCase()}</span>
        <span>${c.charAt(0).toUpperCase() + c.slice(1)}</span>
      </button>`
      )
      .join('');

    card.innerHTML = `
      <div class="question-workspace" style="animation: fadeUp 0.3s ease both">
        <h1 class="question-display">
          ${isEn ? 'One last step — choose your Clan' : 'Un último paso — elige tu Clan'}
        </h1>
        <p style="color:var(--text-muted);margin-bottom:1.5rem;font-size:15px">
          ${
            isEn
              ? 'Your clan is the team you will grow with at Riwi.'
              : 'Tu clan es el equipo con el que crecerás en Riwi.'
          }
        </p>
        <div class="options-layout" id="clan-options">${opts}</div>
        <p id="clan-error" style="color:var(--color-error);font-size:13px;margin-top:1rem;display:none">
          ${isEn ? 'Please select a clan.' : 'Por favor selecciona un clan.'}
        </p>
        <footer class="workspace-footer">
          <span></span>
          <button class="btn-dashboard" id="btnConfirmClan" type="button">
            ${isEn ? 'Confirm →' : 'Confirmar →'}
          </button>
        </footer>
      </div>`;

    document.querySelectorAll('.clan-option').forEach((btn) => {
      if (btn.dataset.clan === this.selectedClan) btn.classList.add('selected');
      btn.addEventListener('click', () => {
        document
          .querySelectorAll('.clan-option')
          .forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedClan = btn.dataset.clan;
        document.getElementById('clan-error').style.display = 'none';
      });
    });

    document.getElementById('btnConfirmClan').addEventListener('click', () => {
      if (!this.selectedClan) {
        document.getElementById('clan-error').style.display = 'block';
        return;
      }
      this.inClanSelection = false;
      this._finish(this.selectedClan);
    });
  },

  _renderFinalSuccess() {
    const card = document.getElementById('question-card');
    if (!card) return;

    const isEn = getLang() === 'en';
    card.innerHTML = `
    <div class="finish-screen">
      <div class="finish-icon">✓</div>
      <h2>${isEn ? 'Diagnostic complete' : 'Diagnóstico completado'}</h2>
      <p>${
        isEn
          ? 'We have mapped your learning profile.<br>Kairo is setting up your personalized path.'
          : 'Hemos mapeado tu perfil de aprendizaje.<br>Kairo está configurando tu ruta personalizada.'
      }</p>
      <button class="btn-dashboard" id="btnDash">
        ${isEn ? 'Go to Dashboard →' : 'Ir al Dashboard →'}
      </button>
    </div>`;

    document.getElementById('btnDash')?.addEventListener('click', () => {
      window.location.href = '/frontend/src/views/coder/dashboard.html';
    });
  },

  /* FINISH: POST to backend */
  async _finish(clan) {
    this.finished = true;

    /* Update nav */
    const fill = document.getElementById('progress-fill');
    const navPct = document.getElementById('navPct');
    const navStep = document.getElementById('navStep');
    if (fill) fill.style.width = '100%';
    if (navPct) navPct.textContent = '100%';
    if (navStep)
      navStep.textContent = getLang() === 'en' ? 'Completed' : 'Completado';

    /* Mark all tabs completed */
    this._renderStepper(null);

    /* Hide block header */
    const blockHeader = document.querySelector('.block-header');
    if (blockHeader) blockHeader.style.display = 'none';

    /* Show loading state */
    const card = document.getElementById('question-card');
    if (card) {
      card.innerHTML = `
        <div class="finish-screen">
          <div class="spinner" style="width:40px;height:40px;border-width:3px"></div>
          <p style="color:var(--text-muted);margin-top:1rem">
            ${getLang() === 'en' ? 'Saving your profile...' : 'Guardando tu perfil...'}
          </p>
        </div>`;
    }

    try {
      /* Complete onboarding (sets first_login = false, saves clan) */
      const onboardRes = await authService.completeOnboarding({ clan });
      if (!onboardRes.ok) throw new Error('completeOnboarding failed');

      /* Save diagnostic answers */
      const diagRes = await authService.saveDiagnostic({
        answers: this.userAnswers,
      });
      if (!diagRes.ok)
        console.warn('[Kairo] Diagnostic save failed — non-blocking');
    } catch (err) {
      console.error('[Kairo] Finish error:', err);
    }

    this._renderFinalSuccess();
  },
};

/* ── Expose globally for onclick= attributes ── */
window.onboardingController = onboardingController;

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', () =>
  onboardingController.init()
);
