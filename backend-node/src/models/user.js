/**
 * Riwi Learning Platform - User Model
 * Data Access Object for user persistence and authentication.
 */

import { query } from '../config/database.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Persists a new user with hashed credentials and Clan assignment.
 */
export async function create({ email, password, fullName, role, clan }) {
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  // Agregamos 'clan' a la consulta SQL
  const queryText = `
    INSERT INTO users (email, password, full_name, role, clan)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, email, full_name, role, clan, first_login, created_at
  `;

  // Añadimos el valor del clan al array de parámetros
  const values = [email, hashedPassword, fullName, role, clan];
  const result = await query(queryText, values);
  return result.rows[0];
}

/**
 * Finds a user by their unique email address.
 * Optimized for login flows - Added clan to selection.
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
 * Excludes sensitive data like password hashes.
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

/**
 * Transitions user out of the onboarding phase.
 */
export async function updateFirstLogin(userId) {
  const queryText = `
    UPDATE users 
    SET first_login = false 
    WHERE id = $1
    RETURNING id, first_login
  `;
  const result = await query(queryText, [userId]);
  return result.rows[0];
}

/**
 * Performs dynamic updates on user profile fields.
 */
export async function updateUserInDb(userId, updates) {
  const fields = Object.keys(updates);
  if (fields.length === 0) return null;

  const finalUpdates = { ...updates };

  if (finalUpdates.password) {
    finalUpdates.password = await bcrypt.hash(
      finalUpdates.password,
      SALT_ROUNDS
    );
  }

  const keys = Object.keys(finalUpdates);
  const setClause = keys
    .map((field, index) => `${field} = $${index + 1}`)
    .join(', ');

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
