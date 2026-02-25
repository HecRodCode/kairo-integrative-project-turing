/**
 * Riwi Learning Platform - Unified Team Leader Controller
 * Manages clan monitoring, risk assessment, and coder feedback loops.
 */

import { query } from '../config/database.js';
import { calculatePercentage, formatDate } from '../utils/helpers.js';
import { sanitizeInput } from '../utils/validators.js';

/**
 * Retrieves all coders in a specific clan with combined academic and risk data.
 */
export async function getAllCodersByClan(req, res) {
  const { clan_id } = req.params;
  try {
    const text = `
      SELECT 
        u.id, u.full_name, u.email, 
        mp.average_score, mp.current_week, 
        rf.risk_level, rf.reason as risk_reason
      FROM users u
      LEFT JOIN moodle_progress mp ON u.id = mp.coder_id
      LEFT JOIN risk_flags rf ON u.id = rf.coder_id AND rf.resolved = false
      WHERE u.role = 'coder' AND u.clan_id = $1
      ORDER BY rf.risk_level DESC NULLS LAST, u.full_name ASC
    `;
    const result = await query(text, [clan_id]);
    res.json({ clan: clan_id, total: result.rows.length, coders: result.rows });
  } catch (error) {
    console.error('[TL Clan View Error]:', error);
    res.status(500).json({ error: 'Failed to fetch clan data' });
  }
}

/**
 * Calculates aggregate metrics for a specific clan.
 * Includes average performance and risk distribution.
 */
export async function getClanMetrics(req, res) {
  const { clan_id } = req.params;
  try {
    const text = `
      SELECT 
        AVG(mp.average_score) as clan_average,
        COUNT(CASE WHEN rf.risk_level = 'high' THEN 1 END) as high_risk_count,
        COUNT(u.id) as total_coders
      FROM users u
      LEFT JOIN moodle_progress mp ON u.id = mp.coder_id
      LEFT JOIN risk_flags rf ON u.id = rf.coder_id AND rf.resolved = false
      WHERE u.clan_id = $1 AND u.role = 'coder'
    `;
    const result = await query(text, [clan_id]);

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

/**
 * Fetches comprehensive detail for a single coder.
 */
export async function getCoderFullDetail(req, res) {
  const { id } = req.params;
  try {
    const text = `
      SELECT 
        u.id, u.full_name, u.email, u.clan_id, u.created_at,
        mp.average_score, mp.completed_activities,
        ss.autonomy, ss.time_management, ss.problem_solving, 
        ss.communication, ss.teamwork, ss.learning_style
      FROM users u
      LEFT JOIN moodle_progress mp ON u.id = mp.coder_id
      LEFT JOIN soft_skills_assessment ss ON u.id = ss.coder_id
      WHERE u.id = $1 AND u.role = 'coder'
    `;
    const result = await query(text, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Coder not found' });
    }

    const coderData = result.rows[0];
    coderData.joined_date = formatDate(coderData.created_at);

    res.json({ coder: coderData });
  } catch (error) {
    console.error('[TL Coder Detail Error]:', error);
    res.status(500).json({ error: 'Failed to fetch coder details' });
  }
}

/**
 * Submits mentor feedback.
 */
export async function submitFeedback(req, res) {
  const { coderId, feedbackText, feedbackType } = req.body;
  const tlId = req.session.userId;

  if (!coderId || !feedbackText || !feedbackType) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const text = `
      INSERT INTO tl_feedback (coder_id, tl_id, feedback_text, feedback_type, created_at)
      VALUES ($1, $2, $3, $4, NOW()) RETURNING *
    `;
    const result = await query(text, [
      coderId,
      tlId,
      sanitizeInput(feedbackText),
      sanitizeInput(feedbackType),
    ]);

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

/**
 * Retrieves all active risk reports.
 */
export async function getRiskReports(req, res) {
  try {
    const text = `
      SELECT rf.*, u.full_name, u.email
      FROM risk_flags rf
      JOIN users u ON rf.coder_id = u.id
      WHERE rf.resolved = false
      ORDER BY CASE WHEN risk_level = 'high' THEN 1 WHEN risk_level = 'medium' THEN 2 ELSE 3 END
    `;
    const result = await query(text);
    res.json({ active_risks: result.rows });
  } catch (error) {
    console.error('[TL Risk Report Error]:', error);
    res.status(500).json({ error: 'Failed to fetch risk reports' });
  }
}
