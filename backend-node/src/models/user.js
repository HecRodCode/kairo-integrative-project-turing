/**
 * Riwi Learning Platform - User Model
 * Data Access Object for user persistence and authentication.
 */

import { query } from '../config/database.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export async function create({ email, password, fullName, role, clan, first_login = true }) {
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const queryText = `
    INSERT INTO users (email, password, full_name, role, clan, first_login)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, email, full_name, role, clan, first_login, created_at
  `;

  const values = [email, hashedPassword, fullName, role, clan || null, first_login];

  const result = await query(queryText, values);
  return result.rows[0];
}

/**
 * Finds a user by their unique email address.
 */
export async function findByEmail(email) {
  const queryText = `
    SELECT id, email, password, full_name, role, clan, first_login 
    FROM users 
    WHERE email = $1
  `;
  const result = await query(queryText, [email]);
  return result.rows[0];
}

/**
 * Retrieves core user data by primary key.
 */
export async function findById(id) {
  const queryText = `
    SELECT id, email, full_name, role, clan, first_login, created_at 
    FROM users 
    WHERE id = $1
  `;
  const result = await query(queryText, [id]);
  return result.rows[0];
}

/**
 * Compares plain text password with stored hash.
 */
export async function verifyPassword(plainPassword, hashedPassword) {
  if (!plainPassword || !hashedPassword) return false;
  return await bcrypt.compare(plainPassword, hashedPassword);
}

export async function updateFirstLogin(userId, clan = null) {
  const queryText = `
    UPDATE users 
    SET first_login = false,
        clan = COALESCE($2, clan)
    WHERE id = $1
    RETURNING id, first_login, clan
  `;
  const result = await query(queryText, [userId, clan]);
  return result.rows[0];
}

/**
 * Performs dynamic updates on user profile fields.
 */
export async function updateUserInDb(userId, updates) {
  const finalUpdates = { ...updates };

  if (finalUpdates.password) {
    finalUpdates.password = await bcrypt.hash(finalUpdates.password, SALT_ROUNDS);
  }

  const keys = Object.keys(finalUpdates);
  if (keys.length === 0) return null;
  const setClause = keys.map((field, index) => `${field} = $${index + 1}`).join(', ');

  const values = [...Object.values(finalUpdates), userId];

  const queryText = `
    UPDATE users 
    SET ${setClause} 
    WHERE id = $${values.length}
    RETURNING id, email, full_name, role, clan, first_login
  `;

  const result = await query(queryText, values);
  return result.rows[0];
}
