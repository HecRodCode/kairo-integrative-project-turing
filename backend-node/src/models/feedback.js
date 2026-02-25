/**
 * Riwi Learning Platform - Feedback Model
 * Manages mentor-to-coder communication and historical feedback records.
 */

import { query } from '../config/database.js';

/**
 * Persists a new feedback entry from a Team Leader.
 */
export async function createFeedback({ coderId, tlId, content, type }) {
  const queryText = `
    INSERT INTO tl_feedback (coder_id, tl_id, feedback_text, feedback_type, created_at)
    VALUES ($1, $2, $3, $4, NOW())
    RETURNING *
  `;
  const values = [coderId, tlId, content, type];
  const result = await query(queryText, values);
  return result.rows[0];
}

/**
 * Retrieves all feedback received by a specific coder.
 */
export async function getFeedbackByCoder(coderId) {
  const queryText = `
    SELECT f.*, u.full_name as mentor_name
    FROM tl_feedback f
    JOIN users u ON f.tl_id = u.id
    WHERE f.coder_id = $1
    ORDER BY f.created_at DESC
  `;
  const result = await query(queryText, [coderId]);
  return result.rows;
}
