/**
 * routes/authRoutes.js
 * Authentication & User Routes.
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
  verifyOtp,
  resendOtp,
} from '../controllers/authControllers.js';
import { isAuthenticated, hasRole } from '../middlewares/authMiddlewares.js';

const router = Router();

/* ── Public ──────────────────────────────────────────────── */
router.post('/register', register);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', login);
router.get('/check', checkAuth);

/* ── Social Auth — Google ────────────────────────────────── */
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

/* ── Social Auth — GitHub ────────────────────────────────── */
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
router.get(
  '/github/callback',
  passport.authenticate('github', {
    failureRedirect: '/login?error=github_failed',
  }),
  socialAuthSuccess
);

/* ── Identity & Session ──────────────────────────────────── */
router.post('/logout', isAuthenticated, logout);
router.get('/me', isAuthenticated, getCurrentUser);

/* ── User Self-Service ───────────────────────────────────── */
router.patch('/profile', isAuthenticated, updateUserProfile);

/* ── Onboarding ──────────────────────────────────────────── */
router.patch(
  '/complete-onboarding',
  isAuthenticated,
  hasRole('coder'),
  updateFirstLoginStatus
);

export default router;
