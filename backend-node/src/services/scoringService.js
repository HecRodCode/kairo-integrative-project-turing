/**
 * services/scoringService.js
 * Kairo internal scoring system.
 */

import { query } from '../config/database.js';

const POINTS = {
  day_complete: 5,
  exercise_submit: 8,
  tl_approved: 15,
  plan_complete: 50,
  inactivity: -3,
};

/**
 * Awards or deducts points for a coder.
 * Logs the event and updates users.kairo_score atomically.
 *
 * @param {number} coderId
 * @param {string} eventType  — one of the keys in POINTS
 * @param {number|null} referenceId  — plan_id, submission_id, etc.
 * @param {number|null} customPoints — override default points (e.g. inactivity per day)
 */
export async function awardPoints(
  coderId,
  eventType,
  referenceId = null,
  customPoints = null
) {
  const points = customPoints ?? POINTS[eventType];
  if (points === undefined) {
    console.warn(`[Scoring] Unknown event type: ${eventType}`);
    return null;
  }

  try {
    // 1. Log the event
    await query(
      `INSERT INTO score_events (coder_id, event_type, points, reference_id)
       VALUES ($1, $2, $3, $4)`,
      [coderId, eventType, points, referenceId]
    );

    // 2. Update kairo_score — floor at 0, never negative
    const result = await query(
      `UPDATE users
       SET kairo_score = GREATEST(0, kairo_score + $1)
       WHERE id = $2
       RETURNING kairo_score`,
      [points, coderId]
    );

    const newScore = result.rows[0]?.kairo_score;

    // 3. Auto risk flag if score drops below threshold
    if (newScore !== undefined && newScore < 30) {
      await _autoRiskFlag(coderId, newScore);
    }

    console.log(
      `[Scoring] coder=${coderId} event=${eventType} points=${points > 0 ? '+' : ''}${points} → score=${newScore}`
    );

    return newScore;
  } catch (err) {
    console.error('[Scoring] awardPoints failed:', err.message);
    return null;
  }
}

/**
 * Returns the full score history for a coder.
 * Used in TL detail panel and coder profile.
 */
export async function getScoreHistory(coderId) {
  try {
    const result = await query(
      `SELECT event_type, points, reference_id, created_at
       FROM score_events
       WHERE coder_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [coderId]
    );
    return result.rows;
  } catch (err) {
    console.error('[Scoring] getScoreHistory failed:', err.message);
    return [];
  }
}

/**
 * Inactivity check — called by a daily cron or health endpoint.
 * Deducts 3 points per day of inactivity beyond the threshold.
 */
export async function applyInactivityPenalties() {
  try {
    // Find coders who haven't completed any activity in the last 3 days
    const result = await query(
      `SELECT DISTINCT u.id AS coder_id
       FROM users u
       WHERE u.role = 'coder'
         AND u.is_active = true
         AND u.first_login = false
         AND NOT EXISTS (
           SELECT 1 FROM activity_progress ap
           WHERE ap.coder_id = u.id
             AND ap.completed_at > NOW() - INTERVAL '3 days'
         )
         AND NOT EXISTS (
           SELECT 1 FROM exercise_submissions es
           WHERE es.coder_id = u.id
             AND es.submitted_at > NOW() - INTERVAL '3 days'
         )`
    );

    let penalized = 0;
    for (const row of result.rows) {
      await awardPoints(row.coder_id, 'inactivity', null, -3);
      penalized++;
    }

    console.log(
      `[Scoring] Inactivity penalties applied to ${penalized} coders`
    );
    return penalized;
  } catch (err) {
    console.error('[Scoring] applyInactivityPenalties failed:', err.message);
    return 0;
  }
}

/**
 * Auto-creates a risk flag when kairo_score drops below 30.
 * Non-blocking — if it fails, scoring still proceeds.
 */
async function _autoRiskFlag(coderId, currentScore) {
  try {
    // Check if there's already an unresolved score-based risk flag
    const existing = await query(
      `SELECT id FROM risk_flags
       WHERE coder_id = $1 AND resolved = false AND reason LIKE '%Kairo score%'`,
      [coderId]
    );
    if (existing.rows.length > 0) return;

    const level = currentScore < 10 ? 'critical' : 'high';
    await query(
      `INSERT INTO risk_flags (coder_id, risk_level, reason, auto_detected)
       VALUES ($1, $2, $3, true)`,
      [
        coderId,
        level,
        `Kairo score bajo: ${currentScore} puntos — baja actividad en la plataforma`,
      ]
    );
    console.log(
      `[Scoring] Auto risk flag created: coder=${coderId} level=${level} score=${currentScore}`
    );
  } catch (err) {
    console.error('[Scoring] _autoRiskFlag failed:', err.message);
  }
}
