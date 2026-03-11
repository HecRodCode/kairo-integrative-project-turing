/**
 * Riwi Learning Platform - Moodle Progress Model
 * Synchronizes and retrieves academic performance data from the persistence layer.
 */

import { query } from '../config/database.js';

/**
 * Retrieves the latest progress for a specific coder.
 */
export async function getByCoderId(coderId) {
  const queryText = `
    SELECT * FROM moodle_progress 
    WHERE coder_id = $1 
    ORDER BY updated_at DESC LIMIT 1
  `;
  const result = await query(queryText, [coderId]);
  return result.rows[0];
}

/**
 * Updates or inserts (upsert) academic progress data.
 */
export async function upsertProgress({ coderId, averageScore, completedActivities, currentWeek }) {
  const queryText = `
    INSERT INTO moodle_progress (coder_id, average_score, completed_activities, current_week, updated_at)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (coder_id) DO UPDATE SET
      average_score = EXCLUDED.average_score,
      completed_activities = EXCLUDED.completed_activities,
      current_week = EXCLUDED.current_week,
      updated_at = NOW()
    RETURNING *
  `;
  const values = [coderId, averageScore, completedActivities, currentWeek];
  const result = await query(queryText, values);
  return result.rows[0];
}
