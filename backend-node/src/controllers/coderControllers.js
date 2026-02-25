/**
 * Riwi Learning Platform - Unified Coder Controller
 * Manages Moodle progress, AI-generated learning plans, and activity tracking.
 */

import { query } from '../config/database.js';

/**
 * Retrieves consolidated dashboard data.
 * Combines academic progress and the latest active AI training plan.
 */
export async function getCoderDashboard(req, res) {
  try {
    const userId = req.session.userId;
    const progressQuery = `SELECT * FROM moodle_progress WHERE coder_id = $1`;
    const plansQuery = `
      SELECT id, title, created_at, is_active 
      FROM complementary_plans 
      WHERE coder_id = $1 AND is_active = true 
      ORDER BY created_at DESC LIMIT 1
    `;

    const [progress, plans] = await Promise.all([
      query(progressQuery, [userId]),
      query(plansQuery, [userId]),
    ]);

    res.json({
      moodleStatus: progress.rows[0] || null,
      activeAIPlan: plans.rows[0] || null,
    });
  } catch (error) {
    console.error('[Dashboard Error]:', error);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
}

/**
 * Fetches the full content of a specific AI-generated plan.
 * Includes the 6 prioritized cards (High, Medium, Low).
 */
export async function getPlanDetails(req, res) {
  const { planId } = req.params;
  try {
    const text = `
      SELECT p.*, 
      (SELECT json_agg(a) FROM activities a WHERE a.plan_id = p.id) as activities
      FROM complementary_plans p
      WHERE p.id = $1 AND p.coder_id = $2
    `;
    const result = await query(text, [planId, req.session.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json({ plan: result.rows[0] });
  } catch (error) {
    console.error('[Plan Detail Error]:', error);
    res.status(500).json({ error: 'Failed to retrieve plan details' });
  }
}

/**
 * Updates the completion status of an AI-generated activity.
 * Persists reflection data and time spent for TL review.
 */
export async function updateActivityProgress(req, res) {
  const { id } = req.params; // activity_id
  const { reflectionText, timeSpent } = req.body;
  const userId = req.session.userId;

  try {
    const text = `
      INSERT INTO activity_progress (activity_id, coder_id, completed, reflection_text, time_spent_minutes, completed_at)
      VALUES ($1, $2, true, $3, $4, NOW())
      ON CONFLICT (activity_id, coder_id) 
      DO UPDATE SET 
        reflection_text = EXCLUDED.reflection_text,
        time_spent_minutes = EXCLUDED.time_spent_minutes,
        completed_at = NOW()
      RETURNING *
    `;
    const result = await query(text, [id, userId, reflectionText, timeSpent]);

    res.json({
      success: true,
      message: 'Activity progress updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('[Activity Progress Error]:', error);
    res.status(500).json({ error: 'Failed to update activity progress' });
  }
}

/**
 * Retrieves academic milestones and weekly status from Moodle.
 */
export async function getModuleMilestones(req, res) {
  try {
    const text = `
      SELECT m.name as module_name, w.week_number, w.topic, mp.average_score
      FROM moodle_progress mp
      JOIN modules m ON mp.module_id = m.id
      JOIN weeks w ON m.id = w.module_id
      WHERE mp.coder_id = $1
      ORDER BY w.week_number ASC
    `;
    const result = await query(text, [req.session.userId]);

    res.json({ milestones: result.rows });
  } catch (error) {
    console.error('[Milestones Error]:', error);
    res.status(500).json({ error: 'Failed to fetch module milestones' });
  }
}
