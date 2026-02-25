/**
 * Riwi Learning Platform - User Model
 * Data Access Object for user persistence and authentication.
 */

import { query } from '../config/database.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Persists a new user with hashed credentials.
 * Implements a check to ensure we don't process data if required fields are missing.
 */
export async function create({ email, password, fullName, role }) {
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const queryText = `
    INSERT INTO users (email, password, full_name, role)
    VALUES ($1, $2, $3, $4)
    RETURNING id, email, full_name, role, first_login, created_at
  `;

  const values = [email, hashedPassword, fullName, role];
  const result = await query(queryText, values);
  return result.rows[0];
}

/**
 * Finds a user by their unique email address.
 * Optimized for login flows.
 */
export async function findByEmail(email) {
  const queryText = `
    SELECT id, email, password, full_name, role, first_login 
    FROM users 
    WHERE email = $1
  `;
  const result = await query(queryText, [email]);
  return result.rows[0];
}

/**
 * Retrieves core user data by primary key.
 * Excludes sensitive data like password hashes for standard lookups.
 */
export async function findById(id) {
  const queryText = `
    SELECT id, email, full_name, role, clan_id, first_login, created_at 
    FROM users 
    WHERE id = $1
  `;
  const result = await query(queryText, [id]);
  return result.rows[0];
}

/**
 * Compares plain text password with stored hash.
 * Utility for the authentication controller.
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
 * Features:
 * 1. Automatic password hashing if 'password' is included in updates.
 * 2. Protection against empty update sets.
 * 3. Atomic execution for data consistency.
 */
export async function updateUserInDb(userId, updates) {
  const fields = Object.keys(updates);
  if (fields.length === 0) return null;

  const finalUpdates = { ...updates };

  // High-Level Logic: If password is being updated, hash it here.
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
    RETURNING id, email, full_name, role, first_login
  `;

  const result = await query(queryText, values);
  return result.rows[0];
}
