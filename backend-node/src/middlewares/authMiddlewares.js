/**
 * middlewares/authMiddlewares.js
 * Session validation and Role-Based Access Control — Kairo Project.
 */
import { findById } from '../models/user.js';
import { query } from '../config/database.js';

export async function isAuthenticated(req, res, next) {
  try {
    if (req.user) return next();

    if (!req.session?.userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Active session not found. Please log in.',
      });
    }

    const user = await findById(req.session.userId);
    if (!user) {
      return req.session.destroy(() => {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User account no longer exists.',
        });
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[isAuthenticated]', error.message);
    res
      .status(500)
      .json({ error: 'Internal Server Error during authentication' });
  }
}

export function hasRole(...allowedRoles) {
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!userRole) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No role found for this user.',
      });
    }

    const normalized = userRole.toLowerCase().trim();
    const isAuthorized = allowedRoles.some(
      (r) => r.toLowerCase() === normalized
    );

    if (!isAuthorized) {
      console.warn(
        `[RBAC] User ${req.user.id} (${normalized}) denied. Required: [${allowedRoles}]`
      );
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Requires one of: [${allowedRoles.join(', ')}]`,
      });
    }

    next();
  };
}

export async function checkOnboarding(req, res, next) {
  try {
    const role = req.user?.role?.toLowerCase().trim();

    // TL and admin bypass onboarding entirely
    if (role === 'tl' || role === 'admin') return next();

    // Use req.user.first_login if already loaded (most cases)
    if (req.user?.first_login !== undefined) {
      if (req.user.first_login === true) {
        return res.status(403).json({
          error: 'Onboarding Required',
          message: 'Complete the diagnostic assessment first.',
          requiresOnboarding: true,
          redirect: '/onboarding',
        });
      }
      return next();
    }

    // Fallback: first_login not in session object — query DB
    const { rows } = await query(
      'SELECT first_login FROM users WHERE id = $1',
      [req.user.id]
    );

    if (rows[0]?.first_login === true) {
      return res.status(403).json({
        error: 'Onboarding Required',
        message: 'Complete the diagnostic assessment first.',
        requiresOnboarding: true,
        redirect: '/onboarding',
      });
    }

    next();
  } catch (err) {
    console.error('[checkOnboarding]', err.message);
    return res
      .status(500)
      .json({ error: 'Server error checking onboarding status' });
  }
}
