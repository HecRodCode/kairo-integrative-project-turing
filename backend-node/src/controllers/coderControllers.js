/**
 * controllers/coderControllers.js
 *
 * GET /api/coder/dashboard  → single call that returns everything the
 *   coder dashboard needs: user profile, soft skills, moodle progress,
 *   module info, TL feedback (notifications), active plan status.
 */

import 'dotenv/config';
import { query } from '../config/database.js';

/* ════════════════════════════════════════
   DASHBOARD  —  GET /api/coder/dashboard
════════════════════════════════════════ */

export async function getCoderDashboard(req, res) {
  try {
    const userId = req.session.userId;

    const [
      userResult,
      softSkillsResult,
      progressResult,
      planResult,
      feedbackResult,
      riskResult,
      performanceResult,
    ] = await Promise.all([
      /* 1 — User + current module info */
      query(
        `
        SELECT
          u.full_name, u.email, u.clan, u.role,
          u.current_module_id,
          u.learning_style_cache,
          m.name        AS module_name,
          m.total_weeks AS module_total_weeks,
          m.is_critical
        FROM users u
        LEFT JOIN modules m ON m.id = u.current_module_id
        WHERE u.id = $1
      `,
        [userId]
      ),

      /* 2 — Soft skills assessment */
      query(
        `
        SELECT
          autonomy, time_management, problem_solving,
          communication, teamwork, learning_style, assessed_at
        FROM soft_skills_assessment
        WHERE coder_id = $1
      `,
        [userId]
      ),

      /* 3 — Moodle progress (latest row) */
      query(
        `
        SELECT
          mp.current_week,
          mp.average_score,
          mp.struggling_topics,
          mp.weeks_completed,
          mp.updated_at
        FROM moodle_progress mp
        WHERE mp.coder_id = $1
        ORDER BY mp.updated_at DESC
        LIMIT 1
      `,
        [userId]
      ),

      /* 4 — Active AI plan (status only for dashboard) */
      query(
        `
        SELECT
          id,
          targeted_soft_skill,
          generated_at,
          moodle_status_snapshot->>'plan_type' AS plan_type
        FROM complementary_plans
        WHERE coder_id = $1 AND is_active = true
        ORDER BY generated_at DESC
        LIMIT 1
      `,
        [userId]
      ),

      /* 5 — Last 5 TL feedback messages (notifications) */
      query(
        `
        SELECT
          f.id,
          f.feedback_text,
          f.feedback_type,
          f.created_at,
          u.full_name AS tl_name
        FROM tl_feedback f
        JOIN users u ON u.id = f.tl_id
        WHERE f.coder_id = $1
        ORDER BY f.created_at DESC
        LIMIT 5
      `,
        [userId]
      ),

      /* 6 — Active risk flags */
      query(
        `
        SELECT risk_level, reason, detected_at
        FROM risk_flags
        WHERE coder_id = $1 AND resolved = false
        ORDER BY detected_at DESC
        LIMIT 3
      `,
        [userId]
      ),

      /* 7 — Performance test history */
      query(
        `
        SELECT
          pt.score,
          pt.status,
          pt.taken_at,
          m.name AS module_name
        FROM performance_tests pt
        JOIN modules m ON m.id = pt.module_id
        WHERE pt.coder_id = $1
        ORDER BY pt.taken_at DESC
        LIMIT 3
      `,
        [userId]
      ),
    ]);

    const user = userResult.rows[0] || null;
    const softSkills = softSkillsResult.rows[0] || null;
    const progress = progressResult.rows[0] || null;
    const plan = planResult.rows[0] || null;
    const feedback = feedbackResult.rows || [];
    const riskFlags = riskResult.rows || [];
    const perfTests = performanceResult.rows || [];

    /* ── Derived stats ──────────────────────────────────────────── */

    // Overall soft skills average (1–5) → displayed in the stat ring
    let softSkillsAverage = null;
    if (softSkills) {
      const vals = [
        softSkills.autonomy,
        softSkills.time_management,
        softSkills.problem_solving,
        softSkills.communication,
        softSkills.teamwork,
      ].filter((v) => v !== null && v !== undefined);
      softSkillsAverage = vals.length
        ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2))
        : null;
    }

    // Weeks completed count from JSON history
    const weeksCompletedCount = Array.isArray(progress?.weeks_completed)
      ? progress.weeks_completed.length
      : 0;

    // Unread feedback count (all feedback is "unread" for now — no read flag in schema)
    const unreadNotifications = feedback.length;

    res.json({
      user: user
        ? {
            fullName: user.full_name,
            email: user.email,
            clan: user.clan,
            role: user.role,
            moduleId: user.current_module_id,
            moduleName: user.module_name,
            moduleTotalWeeks: user.module_total_weeks,
            isModuleCritical: user.is_critical,
            learningStyleCache: user.learning_style_cache,
          }
        : null,

      softSkills: softSkills
        ? {
            autonomy: softSkills.autonomy,
            timeManagement: softSkills.time_management,
            problemSolving: softSkills.problem_solving,
            communication: softSkills.communication,
            teamwork: softSkills.teamwork,
            learningStyle: softSkills.learning_style,
            assessedAt: softSkills.assessed_at,
            average: softSkillsAverage,
          }
        : null,

      // Cuando no existe fila en moodle_progress (coder nuevo), defaultea a semana 1.
      // averageScore null (no 0) para que el UI distinga "sin datos" de un 0 real.
      progress: {
        currentWeek: progress?.current_week ?? 1,
        averageScore: progress ? parseFloat(progress.average_score) || null : null,
        strugglingTopics: progress?.struggling_topics || [],
        weeksCompleted: progress?.weeks_completed || [],
        weeksCompletedCount: weeksCompletedCount,
        updatedAt: progress?.updated_at || null,
      },

      activePlan: plan
        ? {
            id: plan.id,
            targetedSoftSkill: plan.targeted_soft_skill,
            planType: plan.plan_type,
            generatedAt: plan.generated_at,
          }
        : null,

      notifications: {
        unread: unreadNotifications,
        items: feedback.map((f) => ({
          id: f.id,
          text: f.feedback_text,
          type: f.feedback_type,
          tlName: f.tl_name,
          createdAt: f.created_at,
        })),
      },

      riskFlags: riskFlags.map((r) => ({
        level: r.risk_level,
        reason: r.reason,
        detectedAt: r.detected_at,
      })),

      performanceTests: perfTests.map((p) => ({
        score: p.score,
        status: p.status,
        moduleName: p.module_name,
        takenAt: p.taken_at,
      })),
    });
  } catch (error) {
    console.error('[Coder Dashboard Error]:', error);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
}

/* ════════════════════════════════════════
   PLAN DETAILS  —  GET /api/coder/plans/:planId
════════════════════════════════════════ */

export async function getPlanDetails(req, res) {
  const { planId } = req.params;
  try {
    const result = await query(
      `
      SELECT
        p.*,
        COALESCE(
          json_agg(a ORDER BY a.day_number, a.id) FILTER (WHERE a.id IS NOT NULL),
          '[]'
        ) AS activities
      FROM complementary_plans p
      LEFT JOIN plan_activities a ON a.plan_id = p.id
      WHERE p.id = $1 AND p.coder_id = $2
      GROUP BY p.id
    `,
      [planId, req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json({ plan: result.rows[0] });
  } catch (error) {
    console.error('[Plan Detail Error]:', error);
    res.status(500).json({ error: 'Failed to retrieve plan details' });
  }
}

/* ════════════════════════════════════════
   ACTIVITY PROGRESS  —  PATCH /api/coder/activities/:id/complete
════════════════════════════════════════ */

export async function updateActivityProgress(req, res) {
  const { id } = req.params;
  const { reflectionText, timeSpent } = req.body;
  const userId = req.session.userId;

  try {
    const result = await query(
      `
      INSERT INTO activity_progress
        (activity_id, coder_id, completed, reflection_text, time_spent_minutes, completed_at)
      VALUES ($1, $2, true, $3, $4, NOW())
      ON CONFLICT (activity_id, coder_id)
      DO UPDATE SET
        reflection_text    = EXCLUDED.reflection_text,
        time_spent_minutes = EXCLUDED.time_spent_minutes,
        completed_at       = NOW()
      RETURNING *
    `,
      [id, userId, reflectionText, timeSpent]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Activity Progress Error]:', error);
    res.status(500).json({ error: 'Failed to update activity progress' });
  }
}

/* ══ GET ACTIVE PLAN  —  GET /api/coder/plan ═══ */
export async function getActivePlan(req, res) {
  try {
    const userId = req.session.userId;

    const result = await query(
      `
      SELECT
        id, coder_id, module_id, plan_content,
        soft_skills_snapshot, moodle_status_snapshot,
        targeted_soft_skill, is_active, generated_at,
        COALESCE(completed_days, '{}'::jsonb) AS completed_days
      FROM complementary_plans
      WHERE coder_id = $1 AND is_active = true
      ORDER BY generated_at DESC
      LIMIT 1
    `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ hasPlan: false, plan: null });
    }

    const row = result.rows[0];
    const completedDays = row.completed_days || {};
    const completedCount = Object.keys(completedDays).length;

    // Primer día sin completar entre 1 y 20
    let currentDay = 1;
    for (let d = 1; d <= 20; d++) {
      if (!completedDays[String(d)]) {
        currentDay = d;
        break;
      }
    }

    res.json({
      hasPlan: true,
      plan: {
        id: row.id,
        moduleId: row.module_id,
        planContent: row.plan_content,
        softSkillsSnapshot: row.soft_skills_snapshot,
        moodleStatusSnapshot: row.moodle_status_snapshot,
        targetedSoftSkill: row.targeted_soft_skill,
        generatedAt: row.generated_at,
        completedDays,
        currentDay,
        completedCount,
        isComplete: completedCount >= 20,
      },
    });
  } catch (error) {
    console.error('[getActivePlan]', error);
    res.status(500).json({ error: 'Failed to load plan' });
  }
}

/* ════════════════════════════════════════
   COMPLETE DAY  —  POST /api/coder/plan/:planId/day/:day/complete
════════════════════════════════════════ */

export async function completeDay(req, res) {
  try {
    const userId = req.session.userId;
    const planId = parseInt(req.params.planId);
    const dayNum = parseInt(req.params.day);

    if (!dayNum || dayNum < 1 || dayNum > 20) {
      return res
        .status(400)
        .json({ error: 'Día inválido. Debe ser entre 1 y 20.' });
    }

    // Verificar que el plan pertenece al coder
    const check = await query(
      `
      SELECT id, completed_days
      FROM complementary_plans
      WHERE id = $1 AND coder_id = $2 AND is_active = true
    `,
      [planId, userId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Plan no encontrado o inactivo.' });
    }

    const current = check.rows[0].completed_days || {};
    current[String(dayNum)] = { completedAt: new Date().toISOString() };

    await query(
      `
      UPDATE complementary_plans
      SET completed_days = $1::jsonb
      WHERE id = $2
    `,
      [JSON.stringify(current), planId]
    );

    const completedCount = Object.keys(current).length;

    // Siguiente día sin completar
    let nextDay = null;
    for (let d = dayNum + 1; d <= 20; d++) {
      if (!current[String(d)]) {
        nextDay = d;
        break;
      }
    }

    res.json({
      success: true,
      completedDays: current,
      completedCount,
      nextDay,
      isComplete: completedCount >= 20,
    });
  } catch (error) {
    console.error('[completeDay]', error);
    res.status(500).json({ error: 'Failed to complete day' });
  }
}

/* ══ REQUEST PLAN === */
const PYTHON_API = process.env.PYTHON_API_URL || 'http://localhost:8000';

export async function requestPlan(req, res) {
  try {
    const userId = req.session.userId;

    // Obtener module_id del coder
    const userResult = await query(
      `
      SELECT current_module_id FROM users WHERE id = $1
    `,
      [userId]
    );

    const moduleId = userResult.rows[0]?.current_module_id ?? 4;
    const planType = req.body.plan_type || 'interpretive';
    const currentWeek = req.body.current_week || 1;

    // Responder inmediatamente
    res.json({
      requested: true,
      message: 'Plan en generación. Reintenta en unos segundos.',
    });

    // Fire-and-forget hacia Python
    fetch(`${PYTHON_API}/generate-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coder_id: userId,
        module_id: moduleId,
        plan_type: planType,
        current_week: currentWeek,
      }),
    }).catch((err) =>
      console.error('[requestPlan] Python unreachable:', err.message)
    );
  } catch (error) {
    console.error('[requestPlan]', error);
    res.status(500).json({ error: 'Failed to request plan' });
  }
}

export async function getModuleMilestones(req, res) {
  try {
    const result = await query(
      `
      SELECT
        m.name  AS module_name,
        w.week_number,
        w.name  AS week_name,
        mp.average_score
      FROM moodle_progress mp
      JOIN modules m ON mp.module_id = m.id
      JOIN weeks   w ON m.id = w.module_id
      WHERE mp.coder_id = $1
      ORDER BY w.week_number ASC
    `,
      [req.session.userId]
    );

    res.json({ milestones: result.rows });
  } catch (error) {
    console.error('[Milestones Error]:', error);
    res.status(500).json({ error: 'Failed to fetch milestones' });
  }
}
