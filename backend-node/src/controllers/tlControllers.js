/**
 * controllers/tlControllers.js
 * Team Leader Controller.
 */

import { query } from '../config/database.js';
import { calculatePercentage, formatDate } from '../utils/helpers.js';
import { sanitizeInput } from '../utils/validators.js';
import { notifyUser } from '../services/notificationService.js';
import { awardPoints } from '../services/scoringService.js';

/* CLAN OVERVIEW */

/**
 * GET /api/tl/coders/clan/:clan_id
 * All coders in a clan with latest progress and unresolved risk flag.
 * FIX: u.clan_id → u.clan
 */
export async function getAllCodersByClan(req, res) {
  const { clan_id } = req.params;
  try {
    const result = await query(
      `
      SELECT
        u.id,
        u.full_name,
        u.email,
        mp.average_score,
        mp.current_week,
        rf.risk_level,
        rf.reason AS risk_reason
      FROM users u
      LEFT JOIN moodle_progress mp ON u.id = mp.coder_id
      LEFT JOIN risk_flags rf ON u.id = rf.coder_id AND rf.resolved = false
      WHERE u.role = 'coder'
        AND u.clan = $1
      ORDER BY
        CASE rf.risk_level
          WHEN 'critical' THEN 1
          WHEN 'high'     THEN 2
          WHEN 'medium'   THEN 3
          ELSE 4
        END,
        u.full_name ASC
    `,
      [clan_id]
    );

    res.json({ clan: clan_id, total: result.rows.length, coders: result.rows });
  } catch (error) {
    console.error('[TL Clan View Error]:', error);
    res.status(500).json({ error: 'Failed to fetch clan data' });
  }
}

/* CLAN METRICS */
/**
 * GET /api/tl/metrics/clan/:clan_id
 * FIX: u.clan_id → u.clan
 */
export async function getClanMetrics(req, res) {
  const { clan_id } = req.params;
  try {
    const result = await query(
      `
      SELECT
        AVG(mp.average_score)                                   AS clan_average,
        COUNT(CASE WHEN rf.risk_level IN ('high','critical')
                   THEN 1 END)                                  AS high_risk_count,
        COUNT(u.id)                                             AS total_coders
      FROM users u
      LEFT JOIN moodle_progress mp ON u.id = mp.coder_id
      LEFT JOIN risk_flags rf ON u.id = rf.coder_id AND rf.resolved = false
      WHERE u.clan = $1
        AND u.role = 'coder'
    `,
      [clan_id]
    );

    const clanAverage = parseFloat(result.rows[0].clan_average || 0);
    const highRiskCount = parseInt(result.rows[0].high_risk_count || 0);
    const totalCoders = parseInt(result.rows[0].total_coders || 0);

    res.json({
      clanId: clan_id,
      metrics: {
        averagePerformance: clanAverage.toFixed(2),
        highRiskCoders: highRiskCount,
        totalStudents: totalCoders,
        riskPercentage: calculatePercentage(highRiskCount, totalCoders),
      },
    });
  } catch (error) {
    console.error('[TL Metrics Error]:', error);
    res.status(500).json({ error: 'Failed to calculate clan metrics' });
  }
}

/* CODER FULL DETAIL */

/**
 * GET /api/tl/coder/:id/details
 * FIXES:
 *  - u.clan_id → u.clan
 *  - mp.completed_activities removed (does not exist in schema)
 */
export async function getCoderFullDetail(req, res) {
  const { id } = req.params;
  try {
    const result = await query(
      `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.clan AS clan_id,
        u.created_at,
        mp.average_score,
        mp.current_week,
        mp.weeks_completed,
        ss.autonomy,
        ss.time_management,
        ss.problem_solving,
        ss.communication,
        ss.teamwork,
        ss.learning_style
      FROM users u
      LEFT JOIN moodle_progress        mp ON u.id = mp.coder_id
      LEFT JOIN soft_skills_assessment ss ON u.id = ss.coder_id
      WHERE u.id = $1
        AND u.role = 'coder'
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Coder not found' });
    }

    const coder = result.rows[0];
    coder.joined_date = formatDate(coder.created_at);
    // clan -> clan_id fix for frontend sync
    coder.clanId = coder.clan;
    coder.clan_id = coder.clan;

    res.json({ coder });
  } catch (error) {
    console.error('[TL Coder Detail Error]:', error);
    res.status(500).json({ error: 'Failed to fetch coder details' });
  }
}

/* FEEDBACK */
/**
 * POST /api/tl/feedback
 */
export async function submitFeedback(req, res) {
  const { coderId, feedbackText, feedbackType } = req.body;
  const tlId = req.session.userId;

  if (!coderId || !feedbackText || !feedbackType) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const result = await query(
      `
      INSERT INTO tl_feedback (coder_id, tl_id, feedback_text, feedback_type, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `,
      [coderId, tlId, sanitizeInput(feedbackText), sanitizeInput(feedbackType)]
    );

    // Get TL name for the notification
    const tlResult = await query('SELECT full_name FROM users WHERE id = $1', [
      tlId,
    ]);
    const tlName = tlResult.rows[0]?.full_name || 'Tu TL';

    // Dispatch realtime notification to the coder
    await notifyUser(
      coderId,
      'Nuevo Feedback Requerido',
      `${tlName} te ha dejado un feedback: "${feedbackText.substring(0, 50)}..."`,
      'feedback',
      result.rows[0].id
    );

    res.status(201).json({
      success: true,
      message: 'Feedback registered',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('[TL Feedback Error]:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
}

/*  RISK REPORTS */

/**
 * GET /api/tl/risk-flags
 * FIX: explicit CASE ORDER BY instead of text comparison
 */
export async function getRiskReports(req, res) {
  try {
    const result = await query(`
      SELECT rf.*, u.full_name, u.email
      FROM risk_flags rf
      JOIN users u ON rf.coder_id = u.id
      WHERE rf.resolved = false
      ORDER BY
        CASE rf.risk_level
          WHEN 'critical' THEN 1
          WHEN 'high'     THEN 2
          WHEN 'medium'   THEN 3
          ELSE 4
        END
    `);

    res.json({ active_risks: result.rows });
  } catch (error) {
    console.error('[TL Risk Report Error]:', error);
    res.status(500).json({ error: 'Failed to fetch risk reports' });
  }
}

/* DASHBOARD DATA (MAIN) */
export async function getDashboardData(req, res) {
  const tlId = req.user?.id || req.session?.userId;

  try {
    const tlResult = await query(
      'SELECT full_name, clan AS clan_id FROM users WHERE id = $1',
      [tlId]
    );
    const tl = tlResult.rows[0];
    if (!tl) return res.status(404).json({ error: 'TL not found' });

    const codersResult = await query(
      `SELECT
         u.id,
         u.full_name,
         u.email,
         u.first_login,
         u.clan        AS clan_id,
         u.kairo_score,
         mp.average_score,
         mp.current_week,
         ss.autonomy,
         ss.time_management,
         ss.problem_solving,
         ss.communication,
         ss.teamwork,
         ss.learning_style,
         rf.risk_level
       FROM users u
       LEFT JOIN moodle_progress        mp ON u.id = mp.coder_id
       LEFT JOIN soft_skills_assessment ss ON u.id = ss.coder_id
       LEFT JOIN risk_flags             rf ON u.id = rf.coder_id AND rf.resolved = false
       WHERE u.role = 'coder' AND u.clan = $1
       ORDER BY u.full_name ASC`,
      [tl.clan_id]
    );

    const coders = codersResult.rows;

    const totalCoders = coders.length;
    const completedOnboarding = coders.filter((c) => !c.first_login).length;
    const highRiskCoders = coders.filter(
      (c) => c.risk_level === 'high' || c.risk_level === 'critical'
    ).length;
    const clanKairoAvg =
      coders.length > 0
        ? Math.round(
            coders.reduce((acc, c) => acc + parseInt(c.kairo_score ?? 50), 0) /
              coders.length
          )
        : 50;

    const overview = {
      totalCoders,
      completedOnboarding,
      pendingOnboarding: totalCoders - completedOnboarding,
      highRiskCoders,
      clanAvgScore: clanKairoAvg,
    };

    const softSkillsAverage = {
      autonomy: 0,
      time_management: 0,
      problem_solving: 0,
      communication: 0,
      teamwork: 0,
    };

    const codersWithSkills = coders.filter((c) => c.learning_style !== null);
    if (codersWithSkills.length > 0) {
      codersWithSkills.forEach((c) => {
        softSkillsAverage.autonomy += parseFloat(c.autonomy || 0);
        softSkillsAverage.time_management += parseFloat(c.time_management || 0);
        softSkillsAverage.problem_solving += parseFloat(c.problem_solving || 0);
        softSkillsAverage.communication += parseFloat(c.communication || 0);
        softSkillsAverage.teamwork += parseFloat(c.teamwork || 0);
      });
      Object.keys(softSkillsAverage).forEach((key) => {
        softSkillsAverage[key] = parseFloat(
          (softSkillsAverage[key] / codersWithSkills.length).toFixed(1)
        );
      });
    }

    return res.json({
      tl: { fullName: tl.full_name, clanId: tl.clan_id },
      coders,
      overview,
      softSkillsAverage,
    });
  } catch (error) {
    console.error('[Dashboard Data Error]:', error.message);
    return res.status(500).json({ error: 'Error loading dashboard data' });
  }
}

export async function getSubmissions(req, res) {
  const tlId = req.user?.id || req.session?.userId;

  try {
    // Get TL's clan
    const tlResult = await query('SELECT clan FROM users WHERE id = $1', [
      tlId,
    ]);
    const clan = tlResult.rows[0]?.clan;
    if (!clan) return res.status(400).json({ error: 'TL sin clan asignado.' });

    const result = await query(
      `SELECT
         es.id,
         es.code_submitted,
         es.submitted_at,
         es.tl_feedback_text,
         es.reviewed_at,
         es.reviewed_by,
         e.title        AS exercise_title,
         e.language,
         e.difficulty,
         e.topic,
         e.solution,
         e.expected_output,
         e.day_number,
         u.full_name    AS coder_name,
         u.id           AS coder_id,
         cp.id          AS plan_id
       FROM exercise_submissions es
       JOIN exercises e            ON es.exercise_id = e.id
       JOIN users u                ON es.coder_id = u.id
       JOIN complementary_plans cp ON e.plan_id = cp.id
       WHERE u.clan = $1
       ORDER BY es.submitted_at DESC
       LIMIT 50`,
      [clan]
    );

    return res.json({ submissions: result.rows });
  } catch (err) {
    console.error('[getSubmissions]', err.message);
    return res.status(500).json({ error: 'Failed to fetch submissions' });
  }
}

/* REVIEW SUBMISSION */
export async function reviewSubmission(req, res) {
  const tlId = req.user?.id || req.session?.userId;
  const submissionId = parseInt(req.params.id);
  const { feedbackText } = req.body;

  if (!feedbackText?.trim()) {
    return res.status(400).json({ error: 'feedbackText es requerido.' });
  }

  try {
    // Verify submission belongs to a coder in TL's clan
    const checkResult = await query(
      `SELECT es.id, es.coder_id, e.title AS exercise_title
       FROM exercise_submissions es
       JOIN exercises e ON es.exercise_id = e.id
       JOIN users u     ON es.coder_id = u.id
       JOIN users tl    ON tl.id = $2
       WHERE es.id = $1 AND u.clan = tl.clan`,
      [submissionId, tlId]
    );

    if (checkResult.rows.length === 0) {
      return res
        .status(404)
        .json({ error: 'Submission no encontrada o no autorizada.' });
    }

    const { coder_id, exercise_title } = checkResult.rows[0];

    // Save feedback
    const result = await query(
      `UPDATE exercise_submissions
       SET tl_feedback_text = $1, reviewed_at = NOW(), reviewed_by = $2
       WHERE id = $3
       RETURNING id, tl_feedback_text, reviewed_at`,
      [feedbackText.trim(), tlId, submissionId]
    );

    // Award bonus points to coder — TL reviewed their work
    await awardPoints(coder_id, 'tl_approved', submissionId);

    // Notify the coder
    const tlNameResult = await query(
      'SELECT full_name FROM users WHERE id = $1',
      [tlId]
    );
    const tlName = tlNameResult.rows[0]?.full_name || 'Tu TL';

    await notifyUser(
      coder_id,
      'Tu TL revisó tu ejercicio',
      `${tlName} dejó feedback en tu ejercicio "${exercise_title}": "${feedbackText.substring(0, 60)}..."`,
      'feedback',
      submissionId
    );

    return res.json({
      success: true,
      submission: result.rows[0],
    });
  } catch (err) {
    console.error('[reviewSubmission]', err.message);
    return res.status(500).json({ error: 'Failed to review submission' });
  }
}

/* SCORE HISTORY */
export async function getCoderScoreHistory(req, res) {
  const { id } = req.params;

  try {
    const result = await query(
      `SELECT
         se.event_type,
         se.points,
         se.created_at,
         u.kairo_score AS current_score
       FROM score_events se
       JOIN users u ON u.id = se.coder_id
       WHERE se.coder_id = $1
       ORDER BY se.created_at DESC
       LIMIT 20`,
      [id]
    );

    const EVENT_LABELS = {
      day_complete: 'Día completado',
      exercise_submit: 'Ejercicio enviado',
      tl_approved: 'TL aprobó solución',
      plan_complete: 'Plan completado (bonus)',
      inactivity: 'Días sin actividad',
    };

    return res.json({
      coderId: parseInt(id),
      currentScore: result.rows[0]?.current_score ?? 0,
      history: result.rows.map((r) => ({
        label: EVENT_LABELS[r.event_type] || r.event_type,
        points: r.points,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error('[getCoderScoreHistory]', err.message);
    return res.status(500).json({ error: 'Failed to fetch score history' });
  }
}

export async function getScoreRanking(req, res) {
  const tlId = req.user?.id || req.session?.userId;

  try {
    const tlResult = await query('SELECT clan FROM users WHERE id = $1', [
      tlId,
    ]);
    const clan = tlResult.rows[0]?.clan;

    // Ranking del clan — todos los coders ordenados por score
    const clanRanking = await query(
      `SELECT
         u.id,
         u.full_name,
         u.kairo_score,
         u.clan,
         RANK() OVER (ORDER BY u.kairo_score DESC) AS rank
       FROM users u
       WHERE u.role = 'coder' AND u.clan = $1 AND u.is_active = true
       ORDER BY u.kairo_score DESC`,
      [clan]
    );

    // Ranking global — top 5 de todos los clanes
    const globalRanking = await query(
      `SELECT
         u.id,
         u.full_name,
         u.kairo_score,
         u.clan,
         RANK() OVER (ORDER BY u.kairo_score DESC) AS rank
       FROM users u
       WHERE u.role = 'coder' AND u.is_active = true
       ORDER BY u.kairo_score DESC
       LIMIT 10`
    );

    return res.json({
      clan,
      clanRanking: clanRanking.rows,
      globalRanking: globalRanking.rows,
    });
  } catch (err) {
    console.error('[getScoreRanking]', err.message);
    return res.status(500).json({ error: 'Failed to fetch ranking' });
  }
}
