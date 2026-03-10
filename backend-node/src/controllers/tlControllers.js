/**
 * controllers/tlControllers.js
 * Team Leader Controller.
 *
 * FIXES:
 *  - u.clan_id → u.clan  (clan is an enum column, not a FK — no clan_id exists)
 *  - mp.completed_activities → removed (column does not exist in schema)
 *  - getCoderFullDetail: u.clan_id → u.clan
 *  - Risk level ORDER BY: added 'critical' tier
 */

import { query } from '../config/database.js';
import { calculatePercentage, formatDate } from '../utils/helpers.js';
import { sanitizeInput } from '../utils/validators.js';

/* ════════════════════════════════════════
   CLAN OVERVIEW
════════════════════════════════════════ */

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

/* ════════════════════════════════════════
   CLAN METRICS
════════════════════════════════════════ */

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

/* ════════════════════════════════════════
   CODER FULL DETAIL
════════════════════════════════════════ */

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
        u.clan,
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

    res.json({ coder });
  } catch (error) {
    console.error('[TL Coder Detail Error]:', error);
    res.status(500).json({ error: 'Failed to fetch coder details' });
  }
}

/* ════════════════════════════════════════
   FEEDBACK
════════════════════════════════════════ */

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

/* ════════════════════════════════════════
   RISK REPORTS
════════════════════════════════════════ */

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
