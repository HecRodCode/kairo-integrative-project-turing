/**
 * Riwi Learning Platform - User Model
 * Data Access Object for user persistence and authentication.
 */

import { query } from '../config/database.js';
import bcrypt from 'bcrypt';

/**
 * Persists a new user with hashed credentials.
 */
export async function create({ email, password, fullName, role }) {
  const hashedPassword = await bcrypt.hash(password, 10);

  const queryText = `
    INSERT INTO users (email, password, full_name, role)
    VALUES ($1, $2, $3, $4)
    RETURNING id, email, full_name, role, created_at
  `;

  const values = [email, hashedPassword, fullName, role];
  const result = await query(queryText, values);
  return result.rows[0];
}

/**
 * Finds a user by their unique email address.
 */
export async function findByEmail(email) {
  const queryText = 'SELECT * FROM users WHERE email = $1';
  const result = await query(queryText, [email]);
  return result.rows[0];
}

/**
 * Retrieves core user data by primary key.
 */
export async function findById(id) {
  const queryText = `
    SELECT id, email, full_name, role, first_login, created_at 
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
 * Validates existence of fields before execution.
 */
export async function updateUserInDb(userId, updates) {
  const fields = Object.keys(updates);
  if (fields.length === 0) return null;

  // Build dynamic SQL query: "SET field1 = $1, field2 = $2..."
  const setClause = fields
    .map((field, index) => `${field} = $${index + 1}`)
    .join(', ');

  const values = [...Object.values(updates), userId];

  const queryText = `
    UPDATE users 
    SET ${setClause} 
    WHERE id = $${values.length}
    RETURNING id, email, full_name, role, first_login
  `;

  const result = await query(queryText, values);
  return result.rows[0];
}
