/**
 * Riwi Learning Platform - Authentication Controller
 * Optimized for strict ENUM handling and consistent Role-Based Access Control.
 */

import {
  findByEmail,
  create,
  verifyPassword,
  findById,
} from '../models/user.js';
import { validateEmail, validatePassword } from '../utils/validators.js';

/**
 * Handles user registration with strict role normalization.
 */
export async function register(req, res) {
  try {
    const { email, password, fullName, full_name, role } = req.body;

    // Consistency: Map both name variants
    const name = fullName || full_name;

    // 1. Mandatory Field Validation
    if (!email || !password || !name || !role) {
      return res.status(400).json({
        error: 'All fields are required',
        fields: ['email', 'password', 'fullName', 'role'],
      });
    }

    // 2. Format Validation
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long',
      });
    }

    /**
     * 3. STRICT ROLE NORMALIZATION
     * This prevents Supabase ENUM errors by forcing lowercase and trimming.
     */
    const normalizedRole = role.toLowerCase().trim();
    const allowedRoles = ['coder', 'tl'];

    if (!allowedRoles.includes(normalizedRole)) {
      return res.status(400).json({
        error: `Invalid role. Expected one of: ${allowedRoles.join(', ')}`,
      });
    }

    // 4. Duplicate Check
    const existingUser = await findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // 5. Database Insertion (Ensuring normalizedRole is sent to the model)
    const newUser = await create({
      email,
      password,
      fullName: name,
      role: normalizedRole,
    });

    console.log(
      `[Registration Success] User: ${email} | Role: ${normalizedRole}`
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.full_name,
        role: newUser.role, // Returned from DB
      },
    });
  } catch (error) {
    console.error('[Registration Error]:', error);
    res
      .status(500)
      .json({ error: 'Internal Server Error during registration' });
  }
}

/**
 * Handles user authentication and session creation.
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await findByEmail(email);

    if (!user) {
      console.log(`[Auth Log] Failed login: ${email} (User not found)`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      console.log(`[Auth Log] Failed login: ${email} (Wrong password)`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    /**
     * 6. SESSION STORAGE
     * We normalize the role again here to ensure frontend routing logic doesn't break.
     */
    const safeRole = user.role.toLowerCase().trim();
    req.session.userId = user.id;
    req.session.role = safeRole;

    console.log(
      `[Auth Log] Login successful: ${email} | DB Role: ${user.role}`
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: safeRole,
        firstLogin: user.first_login,
      },
    });
  } catch (error) {
    console.error('[Login Error]:', error);
    res.status(500).json({ error: 'Internal Server Error during login' });
  }
}

/**
 * Destroys active session and clears auth cookies.
 */
export async function logout(req, res) {
  try {
    req.session.destroy((err) => {
      if (err)
        return res.status(500).json({ error: 'Failed to destroy session' });
      res.clearCookie('connect.sid');
      res.json({ message: 'Logout successful' });
    });
  } catch (error) {
    console.error('[Logout Error]:', error);
    res.status(500).json({ error: 'Internal Server Error during logout' });
  }
}

/**
 * Retrieves current authenticated user data from session.
 */
export async function getCurrentUser(req, res) {
  try {
    const user = await findById(req.session.userId);

    if (!user) {
      return res.status(404).json({ error: 'User session not found' });
    }

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
    console.error('[GetCurrentUser Error]:', error);
    res.status(500).json({ error: 'Failed to fetch user context' });
  }
}

/**
 * Verifies if a session is active and returns the role.
 */
export async function checkAuth(req, res) {
  if (req.session.userId) {
    res.json({
      authenticated: true,
      role: req.session.role,
    });
  } else {
    res.json({ authenticated: false });
  }
}
