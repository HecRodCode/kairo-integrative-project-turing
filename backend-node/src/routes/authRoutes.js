/**
 * Riwi Learning Platform - Authentication & User Routes
 * Maps identity management, social auth, and profile operations to controllers.
 */

import { Router } from 'express';
import passport from 'passport';
import {
  register,
  login,
  checkAuth,
  logout,
  getCurrentUser,
  updateFirstLoginStatus,
  updateUserProfile,
  socialAuthSuccess,
} from '../controllers/authControllers.js';
import { isAuthenticated, hasRole } from '../middlewares/authMiddlewares.js';

const router = Router();

/* public Access, endpoints available without prior authentication */
router.post('/register', register);
router.post('/login', login);
router.get('/check', checkAuth);

/* social Authentication - Google, initiates the OAuth flow and handles the provider's response */
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login?error=google_failed',
  }),
  socialAuthSuccess
);

/* Social Authentication - GitHub, initiates the OAuth flow and handles the provider's response */
router.get(
  '/github',
  passport.authenticate('github', {
    scope: ['user:email'],
  })
);

router.get(
  '/github/callback',
  passport.authenticate('github', {
    failureRedirect: '/login?error=github_failed',
  }),
  socialAuthSuccess
);

/* identity & Session Management, requires an active session to access or terminate */
router.post('/logout', isAuthenticated, logout);
router.get('/me', isAuthenticated, getCurrentUser);

/* user Self-Service, allows users to maintain their own profile data */
router.patch('/profile', isAuthenticated, updateUserProfile);

/* onboarding Flow, transition from new user to active coder after assessment */
router.patch(
  '/complete-onboarding',
  isAuthenticated,
  hasRole('coder'),
  updateFirstLoginStatus
);

export default router;
