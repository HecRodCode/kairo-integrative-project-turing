/**
 * Riwi Learning Platform - Authentication & User Routes
 * Maps identity management and profile operations to controllers.
 */

import { Router } from 'express';
import {
  register,
  login,
  checkAuth,
  logout,
  getCurrentUser,
  updateFirstLoginStatus,
  updateUserProfile, // Added to match the unified controller
} from '../controllers/authControllers.js';
import { isAuthenticated, hasRole } from '../middlewares/authMiddlewares.js';

const router = Router();

/**
 * Public Access
 * Endpoints available without prior authentication.
 */
router.post('/register', register);
router.post('/login', login);
router.get('/check', checkAuth);

/**
 * Identity & Session Management
 * Requires an active session to access or terminate.
 */
router.post('/logout', isAuthenticated, logout);
router.get('/me', isAuthenticated, getCurrentUser);

/**
 * User Self-Service
 * Allows users to maintain their own profile data.
 */
router.patch('/profile', isAuthenticated, updateUserProfile);

/**
 * Onboarding Flow
 * Transition from new user to active coder after assessment.
 */
router.patch(
  '/complete-onboarding',
  isAuthenticated,
  hasRole('coder'),
  updateFirstLoginStatus
);

export default router;
