import { Router } from 'express';
import {
  register,
  login,
  checkAuth,
  logout,
  getCurrentUser,
  updateFirstLoginStatus,
} from '../controllers/authControllers.js';
import { isAuthenticated, hasRole } from '../middlewares/authMiddlewares.js';

const router = Router();

/**
 * Public authentication endpoints
 */
router.post('/register', register);
router.post('/login', login);
router.get('/check', checkAuth);

/**
 * Protected user endpoints
 * Requires valid JWT/Session
 */
router.post('/logout', isAuthenticated, logout);
router.get('/me', isAuthenticated, getCurrentUser);

/**
 * Onboarding and role-specific endpoints
 */
router.patch(
  '/complete-onboarding',
  isAuthenticated,
  hasRole('coder'),
  updateFirstLoginStatus
);

export default router;
