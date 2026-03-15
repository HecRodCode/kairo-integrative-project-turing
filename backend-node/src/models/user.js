/**
 * models/user.js — agrega createOAuth separado para no hashear passwords de OAuth
 */
import { query } from '../config/database.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export async function create({
  email,
  password,
  fullName,
  role,
  clanId,
  first_login = true,
}) {
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await query(
    `INSERT INTO users (email, password, full_name, role, clan, first_login, otp_verified)
     VALUES ($1, $2, $3, $4, $5, $6, false)
     RETURNING id, email, full_name, role, clan AS clan_id, first_login, otp_verified, created_at`,
    [email, hashedPassword, fullName, role, clanId || null, first_login]
  );
  return result.rows[0];
}

/**
 * Para OAuth: no necesita password real ni OTP.
 * Se marca otp_verified = true directamente.
 */
export async function createOAuth({ email, fullName, provider, providerId }) {
  // Password placeholder no hasheable — nunca se usa para login con contraseña
  const placeholderPassword = `oauth_${provider}_${providerId}_${Date.now()}`;
  const result = await query(
    `INSERT INTO users (email, password, full_name, role, clan, first_login, otp_verified)
     VALUES ($1, $2, $3, 'coder', null, true, true)
     RETURNING id, email, full_name, role, clan AS clan_id, first_login, otp_verified, created_at`,
    [email, placeholderPassword, fullName]
  );
  return result.rows[0];
}

export async function findByEmail(email) {
  const result = await query(
    `SELECT id, email, password, full_name, role, clan AS clan_id, first_login, otp_verified
     FROM users WHERE email = $1`,
    [email]
  );
  return result.rows[0];
}

export async function findById(id) {
  const result = await query(
    `SELECT id, email, full_name, role, clan AS clan_id, first_login, otp_verified, created_at
     FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0];
}

export async function verifyPassword(plainPassword, hashedPassword) {
  if (!plainPassword || !hashedPassword) return false;
  // Los passwords de OAuth no son hasheados con bcrypt válido — esto los rechaza correctamente
  if (hashedPassword.startsWith('oauth_')) return false;
  return await bcrypt.compare(plainPassword, hashedPassword);
}

export async function updateFirstLogin(userId, clanId = null) {
  const result = await query(
    `UPDATE users SET first_login = false, clan = COALESCE($2, clan)
     WHERE id = $1
     RETURNING id, first_login, clan AS clan_id`,
    [userId, clanId]
  );
  return result.rows[0];
}

export async function updateUserInDb(userId, updates) {
  const finalUpdates = { ...updates };
  if (finalUpdates.password) {
    finalUpdates.password = await bcrypt.hash(
      finalUpdates.password,
      SALT_ROUNDS
    );
  }
  if (finalUpdates.clan_id !== undefined) {
    finalUpdates.clan = finalUpdates.clan_id;
    delete finalUpdates.clan_id;
  }
  if (finalUpdates.clanId !== undefined) {
    finalUpdates.clan = finalUpdates.clanId;
    delete finalUpdates.clanId;
  }

  const keys = Object.keys(finalUpdates);
  if (keys.length === 0) return null;
  const setClause = keys.map((field, i) => `${field} = $${i + 1}`).join(', ');
  const values = [...Object.values(finalUpdates), userId];
  const result = await query(
    `UPDATE users SET ${setClause} WHERE id = $${values.length}
     RETURNING id, email, full_name, role, clan AS clan_id, first_login`,
    values
  );
  return result.rows[0];
}
