/**
 * backend-node/models/plan.js
 */
import { query } from '../config/database.js';

/**
 * Retrieves the current active plan for a coder.
 */
export async function getActivePlan(coderId) {
  const result = await query(
    `SELECT * FROM complementary_plans
     WHERE coder_id = $1 AND is_active = true
     ORDER BY generated_at DESC LIMIT 1`,
    [coderId]
  );
  return result.rows[0];
}

/**
 * Stores a new AI-generated plan inside a transaction.
 */
export async function savePlan({ coderId, moduleId, planContent, targetedSoftSkill = null }) {
  // Get a dedicated client from the pool to run the transaction
  const { pool } = await import('../config/database.js');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      'UPDATE complementary_plans SET is_active = false WHERE coder_id = $1',
      [coderId]
    );

    const result = await client.query(
      `INSERT INTO complementary_plans
         (coder_id, module_id, plan_content, targeted_soft_skill, is_active, generated_at)
       VALUES ($1, $2, $3, $4, true, NOW())
       RETURNING *`,
      [coderId, moduleId, planContent, targetedSoftSkill]
    );

    await client.query('COMMIT');
    return result.rows[0];

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}