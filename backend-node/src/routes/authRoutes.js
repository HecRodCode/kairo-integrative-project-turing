/**
 * routes/authRoutes.js
 * Authentication & User Routes.
 *
 * FIX: Restored OAuth routes (Google / GitHub) that were lost in a previous version.
 * FIX: Added hasRole('coder') back to /complete-onboarding.
 * FIX: /update-profile changed from PUT to PATCH to match the controller convention.
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
router.post('/verify-otp', verifyOtp); // ← FALTABA — causa raíz
router.post('/resend-otp', resendOtp); // ← FALTABA
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
router.get(
  '/github',
  passport.authenticate('github', { scope: ['user:email'] })
);
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
// FIX: hasRole('coder') restored — only coders complete onboarding
router.patch(
  '/complete-onboarding',
  isAuthenticated,
  hasRole('coder'),
  updateFirstLoginStatus
);

export default router;
