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
  const vark = {
    visual: tally['V'] || 0,
    auditory: tally['A'] || 0,
    reading: tally['R'] || 0,
    kinesthetic: tally['K'] || 0,
  };

  const max = Math.max(...Object.values(vark));
  const total = Object.values(vark).reduce((a, b) => a + b, 0);

  if (total === 0) return 'mixed';

  // If the dominant style is less than 40% of VARK answers → mixed
  const dominant = Object.entries(vark).find(([, v]) => v === max);
  if (!dominant || max / total < 0.4) return 'mixed';

  return dominant[0]; // 'visual' | 'auditory' | 'reading' | 'kinesthetic'
}

/**
 * Maps ILS + Kolb patterns to 1-5 soft skill scores.
 * Each skill counts how many relevant tags appeared, then maps to 1-5.
 */
function deriveSoftSkillScores(tally) {
  const scale = (count, max) =>
    Math.min(5, Math.max(1, Math.round((count / max) * 4) + 1));

  return {
    // Autonomy: reflective + abstract thinkers tend to work independently
    autonomy: scale((tally['REF'] || 0) + (tally['AC'] || 0), 8),
    // Time management: sequential + active experimenters are more structured
    time_management: scale((tally['SEQ'] || 0) + (tally['AE'] || 0), 8),
    // Problem solving: global thinkers + abstract conceptualization
    problem_solving: scale((tally['GLO'] || 0) + (tally['AC'] || 0), 8),
    // Communication: active participants + concrete experience (collaborative)
    communication: scale((tally['ACT'] || 0) + (tally['CE'] || 0), 8),
    // Teamwork: same signals as communication
    teamwork: scale((tally['ACT'] || 0) + (tally['CE'] || 0), 8),
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
      rawAnswers: answers, // stored in raw_answers JSONB column
    });

    res.status(201).json({
      message: 'Diagnostic saved successfully',
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
