import { query } from '../config/database.js';
import bcrypt from 'bcrypt';

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

export async function findByEmail(email) {
  const queryText = 'SELECT * FROM users WHERE email = $1';
  const result = await query(queryText, [email]);
  return result.rows[0];
}

export async function findById(id) {
  const queryText = `
    SELECT id, email, full_name, role, first_login, created_at 
    FROM users 
    WHERE id = $1
  `;
  const result = await query(queryText, [id]);
  return result.rows[0];
}

export async function verifyPassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

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
