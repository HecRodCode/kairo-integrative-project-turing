/**
 * Riwi Learning Platform - Unified Authentication & User Controller
 * Handles Session Management, Identity Verification, and Profile Updates.
 */

import {
  findByEmail,
  create,
  verifyPassword,
  findById,
  updateUserInDb,
} from '../models/user.js';
import { validateEmail, validatePassword } from '../utils/validators.js';
import { query } from '../config/database.js';

/**
 * Handles user registration with strict role normalization.
 */
export async function register(req, res) {
  try {
    const { email, password, fullName, full_name, role } = req.body;
    const name = fullName || full_name;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const normalizedRole = role.toLowerCase().trim();
    const allowedRoles = ['coder', 'tl'];

    if (!allowedRoles.includes(normalizedRole)) {
      return res.status(400).json({ error: 'Invalid role provided' });
    }

    const existingUser = await findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const newUser = await create({
      email,
      password,
      fullName: name,
      role: normalizedRole,
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: newUser.id, email: newUser.email, role: newUser.role },
    });
  } catch (error) {
    console.error('[Registration Error]:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles user authentication and session initialization.
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await findByEmail(email);

    if (!user || !(await verifyPassword(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const safeRole = user.role.toLowerCase().trim();
    req.session.userId = user.id;
    req.session.role = safeRole;

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        fullName: user.full_name,
        role: safeRole,
        firstLogin: user.first_login,
      },
    });
  } catch (error) {
    console.error('[Login Error]:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Updates the first_login flag after completing the onboarding quiz.
 */
export async function updateFirstLoginStatus(req, res) {
  try {
    const queryText =
      'UPDATE users SET first_login = false WHERE id = $1 RETURNING first_login';
    const result = await query(queryText, [req.session.userId]);

    res.json({ success: true, firstLogin: result.rows[0].first_login });
  } catch (error) {
    console.error('[Onboarding Update Error]:', error);
    res.status(500).json({ error: 'Failed to update onboarding status' });
  }
}

/**
 * Updates basic user profile information (Self-service).
 * Fused from previous userControllers.
 */
export async function updateUserProfile(req, res) {
  try {
    const { fullName, email } = req.body;
    const userId = req.session.userId;

    const updates = {};
    if (fullName) updates.full_name = fullName;
    if (email) {
      if (!validateEmail(email))
        return res.status(400).json({ error: 'Invalid email' });
      updates.email = email;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Dynamic query building
    const fields = Object.keys(updates)
      .map((key, i) => `${key} = $${i + 1}`)
      .join(', ');
    const values = [...Object.values(updates), userId];
    const queryText = `UPDATE users SET ${fields} WHERE id = $${values.length} RETURNING id, full_name, email`;

    const result = await query(queryText, values);
    res.json({ message: 'Profile updated', user: result.rows[0] });
  } catch (error) {
    console.error('[Profile Update Error]:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}

/**
 * Retrieves current authenticated user context.
 */
export async function getCurrentUser(req, res) {
  try {
    const user = await findById(req.session.userId);
    if (!user) return res.status(404).json({ error: 'Session expired' });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role.toLowerCase().trim(),
        firstLogin: user.first_login,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}

/**
 * Standard logout and session destruction.
 */
export async function logout(req, res) {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.clearCookie('riwi.sid');
    res.json({ message: 'Logout successful' });
  });
}

/**
 * Simple session verification for frontend guards.
 */
export async function checkAuth(req, res) {
  res.json({
    authenticated: !!req.session.userId,
    role: req.session.role || null,
  });
}
