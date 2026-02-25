/**
 * Riwi Learning Platform - Security Middlewares
 * Handles session validation, identity verification, and Role-Based Access Control (RBAC).
 */

import { findById } from '../models/user.js';

/**
 * Validates that a session is active and the user exists in the database.
 */
export async function isAuthenticated(req, res, next) {
  try {
    if (!req.session || !req.session.userId) {
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
    console.error('[Auth Middleware Error]:', error);
    res
      .status(500)
      .json({ error: 'Internal Server Error during authentication' });
  }
}

/**
 * Enforces Role-Based Access Control (RBAC).
 * Supports single or multiple roles (e.g., hasRole('tl', 'admin')).
 */
export function hasRole(...allowedRoles) {
  return (req, res, next) => {
    const userRole = req.session.role;

    if (!userRole) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No role associated with this session.',
      });
    }

    const normalizedRole = userRole.toLowerCase().trim();
    const isAuthorized = allowedRoles.some(
      (role) => role.toLowerCase() === normalizedRole
    );

    if (!isAuthorized) {
      console.warn(
        `[Security Warning] Access denied for user ${req.session.userId}. Role '${normalizedRole}' not in [${allowedRoles}]`
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
 * Specialized middleware for onboarding flow.
 * Ensures coders complete their diagnostic before accessing the dashboard.
 */
export function checkOnboarding(req, res, next) {
  if (req.session.role === 'coder' && req.user?.first_login) {
    return res.status(403).json({
      error: 'Onboarding Required',
      message: 'You must complete the diagnostic assessment first.',
      redirect: '/onboarding',
    });
  }
  next();
}
