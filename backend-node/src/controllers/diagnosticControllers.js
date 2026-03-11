/**
 * controllers/diagnosticControllers.js
 *
 * FIX: The controller now accepts raw onboarding answers { answers: [] }
 * and derives both the learning_style and the soft-skill scores internally.
 * The frontend never calculates scores — that logic lives here.
 *
 * Score derivation:
 *  Learning style  → dominant VARK score from blocks 1-2
 *  Soft skills     → approximated from ILS + Kolb patterns (blocks 3-7)
 *    · autonomy        ← REF (reflective) + AC (abstract conceptualization)
 *    · time_management ← SEQ (sequential) + AE (active experimentation)
 *    · problem_solving ← GLO (global) + AC
 *    · communication   ← ACT (active) + CE (concrete experience)
 *    · teamwork        ← ACT + CE
 */

import { create, findByCoderId, getAll } from '../models/softSkills.js';
import { findById } from '../models/user.js';

const PYTHON_API = process.env.PYTHON_API_URL || 'http://localhost:8000';

/**
 * Fire-and-forget: asks the Python microservice to generate the first
 * interpretive plan for a coder right after their onboarding completes.
 *
 * We don't await this — the 201 response goes back to the frontend
 * immediately. The plan gets saved in the background to complementary_plans.
 *
 * @param {number} coderId
 * @param {number} moduleId   - user.current_module_id (default 4)
 * @param {number} currentWeek - moodle_progress.current_week (default 1)
 */
async function _triggerInterpretivePlan(coderId, moduleId, currentWeek = 1) {
  try {
    const res = await fetch(`${PYTHON_API}/generate-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coder_id: coderId,
        module_id: moduleId,
        plan_type: 'interpretive',
        current_week: currentWeek,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(`[Plan Gen] Python returned ${res.status}:`, data);
    } else {
      console.log(
        `[Plan Gen] Interpretive plan generated OK — plan_id=${data.plan_id} coder=${coderId}`
      );
    }
  } catch (err) {
    // Never crash the main flow — plan generation is async / best-effort
    console.error(
      '[Plan Gen] Could not reach Python microservice:',
      err.message
    );
  }
}

/* ════════════════════════════════════════
   SCORING ENGINE
════════════════════════════════════════ */

/**
 * Tallies all score tags from the raw answers array.
 * Returns a map like { V: 3, A: 1, R: 2, K: 2, REF: 4, ACT: 2, ... }
 */
function tallyScores(answers) {
  const tally = {};
  answers.forEach(({ score }) => {
    if (!score) return;
    tally[score] = (tally[score] || 0) + 1;
  });
  return tally;
}

/**
 * Determines the dominant VARK learning style.
 * Returns one of: 'visual' | 'auditory' | 'reading' | 'kinesthetic' | 'mixed'
 */
function deriveLearningStyle(tally) {
  // VARK pure tags + ILS equivalents:
  //   VIS (ILS visual)  reinforces V
  //   VRB (ILS verbal)  reinforces A (auditory/verbal learners)
  const vark = {
    visual: (tally['V'] || 0) + (tally['VIS'] || 0),
    auditory: (tally['A'] || 0) + (tally['VRB'] || 0),
    reading: tally['R'] || 0,
    kinesthetic: tally['K'] || 0,
  };

  const max = Math.max(...Object.values(vark));
  const total = Object.values(vark).reduce((a, b) => a + b, 0);

  if (total === 0) return 'mixed';

  // Dominant style must represent >= 35% of all VARK+ILS answers
  const dominant = Object.entries(vark).find(([, v]) => v === max);
  if (!dominant || max / total < 0.35) return 'mixed';

  return dominant[0];
}

/**
 * Maps ILS + Kolb + VARK patterns to 1-5 soft skill scores.
 *
 * Full tag inventory from onboarding-data.js:
 *   VARK:  V, A, R, K
 *   ILS:   ACT, REF, SNS, INT, VIS, VRB, SEQ, GLO
 *   Kolb:  CE, RO, AC, AE
 *
 * Psychological mappings:
 *   autonomy        <- REF + AC + RO  (reflective, abstract, independent)
 *   time_management <- SEQ + AE + SNS (structured, methodical, sensing)
 *   problem_solving <- GLO + AC + INT (big-picture, abstract, intuitive)
 *   communication   <- ACT + CE + VRB (expressive, collaborative, verbal)
 *   teamwork        <- ACT + CE + SNS (active, concrete, sensing)
 */
function deriveSoftSkillScores(tally) {
  const scale = (count, max) =>
    Math.min(5, Math.max(1, Math.round((count / max) * 4) + 1));

  return {
    autonomy: scale(
      (tally['REF'] || 0) + (tally['AC'] || 0) + (tally['RO'] || 0),
      12
    ),
    time_management: scale(
      (tally['SEQ'] || 0) + (tally['AE'] || 0) + (tally['SNS'] || 0),
      14
    ),
    problem_solving: scale(
      (tally['GLO'] || 0) + (tally['AC'] || 0) + (tally['INT'] || 0),
      14
    ),
    communication: scale(
      (tally['ACT'] || 0) + (tally['CE'] || 0) + (tally['VRB'] || 0),
      14
    ),
    teamwork: scale(
      (tally['ACT'] || 0) + (tally['CE'] || 0) + (tally['SNS'] || 0),
      14
    ),
  };
}

/* ════════════════════════════════════════
   CONTROLLERS
════════════════════════════════════════ */

/**
 * POST /api/diagnostics
 * Receives raw onboarding answers, derives scores, saves assessment.
 * Body: { answers: [{ questionId, optionId, score }] }
 */
export async function saveDiagnostic(req, res) {
  try {
    const { answers } = req.body;

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        error: 'answers array is required',
        expected: '{ answers: [{ questionId, optionId, score }] }',
      });
    }

    const tally = tallyScores(answers);
    const learningStyle = deriveLearningStyle(tally);
    const skills = deriveSoftSkillScores(tally);

    const diagnostic = await create({
      coderId: req.session.userId,
      autonomy: skills.autonomy,
      timeManagement: skills.time_management,
      problemSolving: skills.problem_solving,
      communication: skills.communication,
      teamwork: skills.teamwork,
      learningStyle,
      rawAnswers: answers,
    });

    // ── Respond immediately — don't block on plan generation ──────────────
    res.status(201).json({
      message: 'Diagnostic saved successfully',
      planRequested: true, // lets the frontend show "tu plan está siendo generado..."
      diagnostic: {
        coderId: diagnostic.coder_id,
        autonomy: diagnostic.autonomy,
        timeManagement: diagnostic.time_management,
        problemSolving: diagnostic.problem_solving,
        communication: diagnostic.communication,
        teamwork: diagnostic.teamwork,
        learningStyle: diagnostic.learning_style,
        assessedAt: diagnostic.assessed_at,
      },
    });

    // ── Fire-and-forget: generate first interpretive plan in background ────
    // Fetch the user to get current_module_id (default 4 = Base de Datos)
    const user = await findById(req.session.userId).catch(() => null);
    const moduleId = user?.current_module_id ?? 4;
    const currentWeek = 1; // onboarding → always week 1 of the module

    _triggerInterpretivePlan(req.session.userId, moduleId, currentWeek);
  } catch (error) {
    console.error('[Diagnostic Creation Error]:', error);
    res.status(500).json({ error: 'Failed to save diagnostic' });
  }
}

/**
 * GET /api/diagnostics/me
 * Returns the diagnostic for the current authenticated coder.
 */
export async function getDiagnostic(req, res) {
  try {
    const diagnostic = await findByCoderId(req.session.userId);

    if (!diagnostic) {
      return res.status(404).json({
        error: 'Diagnostic not found',
        message: 'You have not completed the assessment yet',
      });
    }

    res.json({
      diagnostic: {
        coderId: diagnostic.coder_id,
        autonomy: diagnostic.autonomy,
        timeManagement: diagnostic.time_management,
        problemSolving: diagnostic.problem_solving,
        communication: diagnostic.communication,
        teamwork: diagnostic.teamwork,
        learningStyle: diagnostic.learning_style,
        assessedAt: diagnostic.assessed_at,
      },
    });
  } catch (error) {
    console.error('[Get Diagnostic Error]:', error);
    res.status(500).json({ error: 'Failed to get diagnostic' });
  }
}

/**
 * GET /api/diagnostics/all
 * TL-only: returns all diagnostics with coder info.
 */
export async function getAllDiagnostics(req, res) {
  try {
    const diagnostics = await getAll();

    res.json({
      diagnostics: diagnostics.map((d) => ({
        coderId: d.coder_id,
        coderEmail: d.email,
        coderName: d.full_name,
        autonomy: d.autonomy,
        timeManagement: d.time_management,
        problemSolving: d.problem_solving,
        communication: d.communication,
        teamwork: d.teamwork,
        learningStyle: d.learning_style,
        assessedAt: d.assessed_at,
      })),
      total: diagnostics.length,
    });
  } catch (error) {
    console.error('[Get All Diagnostics Error]:', error);
    res.status(500).json({ error: 'Failed to get diagnostics' });
  }
}
