/**
 * Riwi Learning Platform - Unified Authentication & User Controller
 * Handles Session Management, Identity Verification, and Social Auth.
 */

import {
  findByEmail,
  create,
  verifyPassword,
  findById,
} from '../models/user.js';
import {
  validateEmail,
  validatePassword,
  validateRole,
  validateFullName,
  sanitizeInput,
} from '../utils/validators.js';
import { query } from '../config/database.js';

/* handles the redirect and session setup after Social Auth (Google/GitHub) This function bridges Passport.js with your existing session logic */
export async function socialAuthSuccess(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Social authentication failed' });
    }

    const { emails, displayName, id, provider } = req.user;
    const email = emails[0].value;

    let user = await findByEmail(email);

    if (!user) {
      user = await create({
        email: email,
        password: `social_auth_${provider}_${id}`,
        fullName: displayName || 'Riwi Coder',
        role: 'coder',
      });
    }

    const safeRole = sanitizeInput(user.role).toLowerCase();
    req.session.userId = user.id;
    req.session.role = safeRole;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5500';
    res.redirect(`${frontendUrl}/dashboard.html`);
  } catch (error) {
    console.error('[Social Auth Success Error]:', error);
    res.status(500).json({ error: 'Failed to synchronize social account' });
  }
}

/* handles user registration with strict role normalization */
export async function register(req, res) {
  try {
    const { email, password, fullName, full_name, role, clan } = req.body;
    const name = fullName || full_name;

    if (!email || !password || !name || !role || !clan) {
      return res
        .status(400)
        .json({ error: 'All fields are required, including Clan selection' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!validatePassword(password)) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 6 characters' });
    }

    if (!validateFullName(name)) {
      return res
        .status(400)
        .json({ error: 'Name must be at least 3 characters' });
    }

    if (!validateRole(role)) {
      return res.status(400).json({ error: 'Invalid role provided' });
    }

    const normalizedRole = sanitizeInput(role).toLowerCase();

    const existingUser = await findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const newUser = await create({
      email: sanitizeInput(email),
      password,
      fullName: sanitizeInput(name),
      role: normalizedRole,
      clan: sanitizeInput(clan).toLowerCase(),
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        clan: newUser.clan,
      },
    });
  } catch (error) {
    console.error('[Registration Error]:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/* handles user authentication and session initialization */
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const user = await findByEmail(email);

    if (!user || !(await verifyPassword(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const safeRole = sanitizeInput(user.role).toLowerCase();
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

/* updates the first_login flag after completing the onboarding quiz */
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

/* updates basic user profile information (Self-service) */
export async function updateUserProfile(req, res) {
  try {
    const { fullName, email } = req.body;
    const userId = req.session.userId;

    const updates = {};

    if (fullName) {
      if (!validateFullName(fullName)) {
        return res
          .status(400)
          .json({ error: 'Name must be at least 3 characters' });
      }
      updates.full_name = sanitizeInput(fullName);
    }

    if (email) {
      if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      updates.email = sanitizeInput(email);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

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

/* retrieves current authenticated user context */
export async function getCurrentUser(req, res) {
  try {
    const user = await findById(req.session.userId);
    if (!user) return res.status(404).json({ error: 'Session expired' });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: sanitizeInput(user.role).toLowerCase(),
        firstLogin: user.first_login,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}

/* updated logout: Clears session and passport info */
export async function logout(req, res) {
  if (req.logout) {
    req.logout((err) => {
      if (err) console.error('Passport logout error');
    });
  }

  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.clearCookie('riwi.sid');
    res.json({ message: 'Logout successful' });
  });
}

/* simple session verification for frontend guards */
export async function checkAuth(req, res) {
  res.json({
    authenticated: !!req.session.userId,
    role: req.session.role || null,
  });
}
