/**
 * middleware/authMiddlewares.js
 * Session validation and Role-Based Access Control — Kairo Project.
 */

import { findById } from '../models/user.js';

/**
 * isAuthenticated
 * Verifies active session and loads the user into req.user.
 * Must run before hasRole — hasRole reads req.user.role set here.
 */
export async function isAuthenticated(req, res, next) {
  try {
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

    req.user = user; // ← role lives here: req.user.role
    next();
  } catch (error) {
    console.error('[isAuthenticated]', error);
    res.status(500).json({ error: 'Internal Server Error during authentication' });
  }
}

/**
 * hasRole(...allowedRoles)
 * Must run AFTER isAuthenticated (depends on req.user set above).
 *
 * BUG WAS HERE: previous version read req.session.role — never populated.
 * FIX: reads req.user.role, which isAuthenticated always sets.
 */
export function hasRole(...allowedRoles) {
  return (req, res, next) => {
    // req.user is guaranteed by isAuthenticated running first
    const userRole = req.user?.role;

    if (!userRole) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No role found for this user.',
      });
    }

    const normalized = userRole.toLowerCase().trim();
    const isAuthorized = allowedRoles.some((r) => r.toLowerCase() === normalized);

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

/**
 * checkOnboarding
 * Blocks dashboard access until first_login = false.
 * Use on protected coder routes that require completed onboarding.
 */
export function checkOnboarding(req, res, next) {
  if (req.user?.role === 'coder' && req.user?.first_login) {
    return res.status(403).json({
      error: 'Onboarding Required',
      message: 'Complete the diagnostic assessment first.',
      redirect: '/onboarding',
    });
  }
  next();
}
