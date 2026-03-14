/**
 * models/softSkills.js
 */

import { query } from '../config/database.js';

export async function create({
  coderId,
  autonomy,
  timeManagement,
  problemSolving,
  communication,
  teamwork,
  learningStyle,
  rawAnswers = null, // FIX: was missing — raw_answers JSONB column
}) {
  const queryText = `
    INSERT INTO soft_skills_assessment (
      coder_id, autonomy, time_management, problem_solving,
      communication, teamwork, learning_style, raw_answers
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (coder_id)
    DO UPDATE SET
      autonomy        = EXCLUDED.autonomy,
      time_management = EXCLUDED.time_management,
      problem_solving = EXCLUDED.problem_solving,
      communication   = EXCLUDED.communication,
      teamwork        = EXCLUDED.teamwork,
      learning_style  = EXCLUDED.learning_style,
      raw_answers     = EXCLUDED.raw_answers,
      assessed_at     = CURRENT_TIMESTAMP
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
    rawAnswers ? JSON.stringify(rawAnswers) : null,
  ];

  const result = await query(queryText, values);
  return result.rows[0];
}

/**
 * Returns the assessment for a single coder.
 */
export async function findByCoderId(coderId) {
  const result = await query('SELECT * FROM soft_skills_assessment WHERE coder_id = $1', [coderId]);
  return result.rows[0];
}

/**
 * Partial update — only touches the fields provided.
 */
export async function update(coderId, updates) {
  const fields = [];
  const values = [];
  let paramCount = 1;

  Object.entries(updates).forEach(([key, val]) => {
    if (val !== undefined) {
      fields.push(`${key} = $${paramCount}`);
      values.push(val);
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
 * All assessments with user info — for TL dashboard.
 */
export async function getAll() {
  const result = await query(`
    SELECT s.*, u.email, u.full_name
    FROM soft_skills_assessment s
    JOIN users u ON s.coder_id = u.id
    ORDER BY s.assessed_at DESC
  `);
  return result.rows;
}

/**
 * Hard delete — use with caution.
 */
export async function deleteByCoderId(coderId) {
  const result = await query('DELETE FROM soft_skills_assessment WHERE coder_id = $1 RETURNING *', [
    coderId,
  ]);
  return result.rows[0];
}
