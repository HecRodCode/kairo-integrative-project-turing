/**
 * controllers/authControllers.js
 *
 * FIX: Added req.session.save() before every res.json() / res.redirect()
 *      that relies on the session being persisted.
 *      Without this, express-session may not finish writing to the store
 *      before the client receives the response and immediately fires a
 *      follow-up request — causing the guard to see no session.
 */

import {
  findByEmail,
  create,
  verifyPassword,
  findById,
  updateFirstLogin,
  updateUserInDb,
} from '../models/user.js';
import {
  validateEmail,
  validatePassword,
  validateRole,
  validateFullName,
  sanitizeInput,
} from '../utils/validators.js';

/* ════════════════════════════════════════
   SOCIAL AUTH
════════════════════════════════════════ */
export async function socialAuthSuccess(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Social authentication failed' });
    }

    req.session.userId = req.user.id;
    req.session.role = sanitizeInput(req.user.role).toLowerCase();
    req.session.firstLogin = req.user.first_login;

    const frontendUrl =
      process.env.FRONTEND_URL || 'http://127.0.0.1:5500/frontend';

    // FIX: save session before redirect so the cookie is fully persisted
    req.session.save((err) => {
      if (err) {
        console.error('[Session Save Error]:', err);
        return res.status(500).json({ error: 'Session could not be saved' });
      }
      return res.redirect(
        req.user.first_login
          ? `${frontendUrl}/src/views/coder/onboarding.html`
          : `${frontendUrl}/src/views/coder/dashboard.html`
      );
    });
  } catch (error) {
    console.error('[Social Auth Success Error]:', error);
    res.status(500).json({ error: 'Failed to synchronize social account' });
  }
}

/* ════════════════════════════════════════
   REGISTER
════════════════════════════════════════ */
export async function register(req, res) {
  try {
    const { email, password, fullName, full_name, role, clan } = req.body;
    const name = fullName || full_name;

    if (!email || !password || !name || !role || !clan) {
      return res.status(400).json({
        error: 'All fields are required, including Clan selection',
      });
    }

    if (
      !validateEmail(email) ||
      !validatePassword(password) ||
      !validateFullName(name) ||
      !validateRole(role)
    ) {
      return res
        .status(400)
        .json({ error: 'Validation failed. Check your inputs.' });
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
      first_login: true,
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        clan: newUser.clan,
        firstLogin: true,
      },
    });
  } catch (error) {
    console.error('[Registration Error]:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/* ════════════════════════════════════════
   LOGIN
════════════════════════════════════════ */
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
    req.session.firstLogin = user.first_login;

    // FIX: save session before responding to eliminate race condition
    req.session.save((err) => {
      if (err) {
        console.error('[Session Save Error]:', err);
        return res.status(500).json({ error: 'Session could not be saved' });
      }
      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          fullName: user.full_name,
          role: safeRole,
          firstLogin: user.first_login,
          clan: user.clan,
        },
      });
    });
  } catch (error) {
    console.error('[Login Error]:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/* ════════════════════════════════════════
   COMPLETE ONBOARDING
════════════════════════════════════════ */
export async function updateFirstLoginStatus(req, res) {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { clan } = req.body;

    const currentUser = await findById(userId);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!currentUser.clan && !clan) {
      return res.status(400).json({
        error: 'Clan is required to complete onboarding',
      });
    }

    const updated = await updateFirstLogin(userId, clan || null);

    // FIX: save updated firstLogin flag before responding
    req.session.firstLogin = false;
    req.session.save((err) => {
      if (err) console.error('[Session Save Error]:', err);
    });

    res.json({
      success: true,
      message: 'Onboarding completed',
      firstLogin: updated.first_login,
      clan: updated.clan,
    });
  } catch (error) {
    console.error('[Onboarding Update Error]:', error);
    res.status(500).json({ error: 'Failed to update onboarding status' });
  }
}

/* ════════════════════════════════════════
   CURRENT USER
════════════════════════════════════════ */
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
        clan: user.clan,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}

/* ════════════════════════════════════════
   UPDATE PROFILE
════════════════════════════════════════ */
export async function updateUserProfile(req, res) {
  try {
    const userId = req.session.userId;
    const updates = req.body;
    const allowed = ['full_name', 'password'];
    const safeUpdates = Object.fromEntries(
      Object.entries(updates).filter(([k]) => allowed.includes(k))
    );

    if (Object.keys(safeUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const updated = await updateUserInDb(userId, safeUpdates);

    res.json({
      message: 'Profile updated',
      user: {
        id: updated.id,
        email: updated.email,
        fullName: updated.full_name,
        role: updated.role,
        clan: updated.clan,
      },
    });
  } catch (error) {
    console.error('[Profile Update Error]:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/* ════════════════════════════════════════
   LOGOUT
════════════════════════════════════════ */
export async function logout(req, res) {
  if (req.logout) {
    req.logout((err) => {
      if (err) console.error('Passport logout error:', err);
    });
  }

  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.clearCookie('riwi.sid');
    res.json({ message: 'Logout successful' });
  });
}

/* ════════════════════════════════════════
   CHECK AUTH
════════════════════════════════════════ */
export async function checkAuth(req, res) {
  res.json({
    authenticated: !!req.session.userId,
    role: req.session.role || null,
    firstLogin: req.session.firstLogin ?? null,
  });
}
