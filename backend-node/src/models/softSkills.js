/**
 * Riwi Learning Platform - Soft Skills Persistence Layer
 * Handles the storage and retrieval of psychometric data and learning styles.
 */

import { query } from '../config/database.js';

/**
 * Persists a new assessment or updates existing scores if the coder has already
 * completed the quiz. Uses an Upsert pattern (ON CONFLICT) for atomicity.
 */
export async function create({
  coderId,
  autonomy,
  timeManagement,
  problemSolving,
  communication,
  teamwork,
  learningStyle,
}) {
  const queryText = `
    INSERT INTO soft_skills_assessment (
      coder_id, autonomy, time_management, problem_solving, 
      communication, teamwork, learning_style
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (coder_id) 
    DO UPDATE SET
      autonomy = EXCLUDED.autonomy,
      time_management = EXCLUDED.time_management,
      problem_solving = EXCLUDED.problem_solving,
      communication = EXCLUDED.communication,
      teamwork = EXCLUDED.teamwork,
      learning_style = EXCLUDED.learning_style,
      assessed_at = CURRENT_TIMESTAMP
    RETURNING *
  `;

  const values = [
    coderId,
    autonomy,
    timeManagement,
    problemSolving,
    communication,
    teamwork,
    learningStyle,
  ];

  const result = await query(queryText, values);
  return result.rows[0];
}

/**
 * Retrieves the specific assessment record for a single coder.
 */
export async function findByCoderId(coderId) {
  const queryText = `
    SELECT * FROM soft_skills_assessment 
    WHERE coder_id = $1
  `;
  const result = await query(queryText, [coderId]);
  return result.rows[0];
}

/**
 * Performs a granular update on specific soft skill fields.
 * Includes automated timestamp management for the 'assessed_at' field.
 */
export async function update(coderId, updates) {
  const fields = [];
  const values = [];
  let paramCount = 1;

  Object.keys(updates).forEach((key) => {
    if (updates[key] !== undefined) {
      fields.push(`${key} = $${paramCount}`);
      values.push(updates[key]);
      paramCount++;
    }
  });

  if (fields.length === 0) return null;

  values.push(coderId);

  const queryText = `
    UPDATE soft_skills_assessment 
    SET ${fields.join(', ')}, assessed_at = CURRENT_TIMESTAMP
    WHERE coder_id = $${paramCount}
    RETURNING *
  `;

  const result = await query(queryText, values);
  return result.rows[0];
}

/**
 * Fetches all assessments with joined user context (Name and Email).
 * Optimized for Team Leader dashboards and reporting.
 */
export async function getAll() {
  const queryText = `
    SELECT 
      s.*,
      u.email,
      u.full_name
    FROM soft_skills_assessment s
    JOIN users u ON s.coder_id = u.id
    ORDER BY s.assessed_at DESC
  `;
  const result = await query(queryText);
  return result.rows;
}

/**
 * Removes a diagnostic record.
 * Note: Use with caution as this deletes historical assessment data.
 */
export async function deleteByCoderId(coderId) {
  const queryText =
    'DELETE FROM soft_skills_assessment WHERE coder_id = $1 RETURNING *';
  const result = await query(queryText, [coderId]);
  return result.rows[0];
}
