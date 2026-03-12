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
export async function upsertProgress({ coderId, moduleId, averageScore, weeksCompleted, currentWeek }) {
  const queryText = `
    INSERT INTO moodle_progress (coder_id, module_id, average_score, weeks_completed, current_week, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (coder_id, module_id) DO UPDATE SET
      average_score = EXCLUDED.average_score,
      weeks_completed = EXCLUDED.weeks_completed,
      current_week = EXCLUDED.current_week,
      updated_at = NOW()
    RETURNING *
  `;
  const values = [coderId, moduleId, averageScore, weeksCompleted, currentWeek];
  const result = await query(queryText, values);
  return result.rows[0];
}