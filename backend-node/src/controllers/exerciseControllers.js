/**
 * controllers/exerciseControllers.js
 */

import { query } from '../config/database.js';

const PYTHON_API = process.env.PYTHON_API_URL || 'http://localhost:8000';

/* ══ GET/GENERATE EXERCISE POST /api/coder/exercise/generate ══ */
export async function generateExercise(req, res) {
  const userId = req.session.userId;
  const {
    planId,
    dayNumber,
    weekNumber,
    topic,
    description,
    difficulty,
    moduleName,
    language,
  } = req.body;

  if (!planId || !dayNumber || !topic) {
    return res
      .status(400)
      .json({ error: 'planId, dayNumber y topic son requeridos.' });
  }

  try {
    // ── 1. Check Node-side cache first (avoids Python round-trip) ────────────
    const cached = await query(
      `SELECT id, title, description, language, starter_code,
              hints, topic, difficulty, expected_output
       FROM exercises
       WHERE plan_id = $1 AND day_number = $2`,
      [planId, dayNumber]
    );

    if (cached.rows.length > 0) {
      return res.json({
        success: true,
        exercise: cached.rows[0],
        cached: true,
      });
    }

    // ── 2. Call Python to generate ───────────────────────────────────────────
    const pyRes = await fetch(`${PYTHON_API}/generate-exercise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coder_id: userId,
        plan_id: planId,
        day_number: dayNumber,
        week_number: weekNumber || 1,
        topic,
        description: description || '',
        difficulty: difficulty || 'intermediate',
        module_name: moduleName || 'Bases de Datos',
        language: language || null,
      }),
    });

    if (!pyRes.ok) {
      const err = await pyRes.json().catch(() => ({}));
      throw new Error(err.detail || `Python API responded ${pyRes.status}`);
    }

    const data = await pyRes.json();
    return res.json(data);
  } catch (error) {
    console.error('[generateExercise]', error.message);
    return res.status(502).json({ error: error.message });
  }
}

/* === SUBMIT SOLUTION POST /api/coder/exercise/:exerciseId/submit === */
export async function submitExercise(req, res) {
  const userId = req.session.userId;
  const exerciseId = parseInt(req.params.exerciseId);
  const { code } = req.body;

  if (!code?.trim()) {
    return res
      .status(400)
      .json({ error: 'El campo code no puede estar vacío.' });
  }

  try {
    // Verify exercise belongs to this coder's plan
    const check = await query(
      `SELECT e.id FROM exercises e
       JOIN complementary_plans cp ON cp.id = e.plan_id
       WHERE e.id = $1 AND cp.coder_id = $2`,
      [exerciseId, userId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Ejercicio no encontrado.' });
    }

    const result = await query(
      `INSERT INTO exercise_submissions (exercise_id, coder_id, code_submitted)
       VALUES ($1, $2, $3) RETURNING id`,
      [exerciseId, userId, code]
    );

    await awardPoints(userId, 'exercise_submit', exerciseId);

    return res.json({
      success: true,
      submissionId: result.rows[0].id,
      message: '¡Solución enviada! Tu TL podrá revisarla.',
    });
  } catch (error) {
    console.error('[submitExercise]', error.message);
    return res.status(500).json({ error: 'Failed to save submission' });
  }
}

/* ═══
   GET SUBMISSIONS FOR AN EXERCISE 
   GET /api/coder/exercise/:exerciseId/submissions 
═══ */
export async function getSubmissions(req, res) {
  const userId = req.session.userId;
  const exerciseId = parseInt(req.params.exerciseId);

  try {
    const result = await query(
      `SELECT id, code_submitted, submitted_at
       FROM exercise_submissions
       WHERE exercise_id = $1 AND coder_id = $2
       ORDER BY submitted_at DESC LIMIT 5`,
      [exerciseId, userId]
    );

    return res.json({ submissions: result.rows });
  } catch (error) {
    console.error('[getSubmissions]', error.message);
    return res.status(500).json({ error: 'Failed to fetch submissions' });
  }
}
