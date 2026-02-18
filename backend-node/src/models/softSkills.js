import { query } from '../config/database.js';

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

export async function findByCoderId(coderId) {
  const queryText = `
    SELECT * FROM soft_skills_assessment 
    WHERE coder_id = $1
  `;
  const result = await query(queryText, [coderId]);
  return result.rows[0];
}

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

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

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
