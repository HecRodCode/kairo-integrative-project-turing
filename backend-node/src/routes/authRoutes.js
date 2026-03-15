/**
 * routes/authRoutes.js
 * Authentication & User Routes — Kairo Project
 */
import { Router } from 'express';
import passport from 'passport';
import {
  register,
  login,
  checkAuth,
  logout,
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
    failureRedirect: `${process.env.FRONTEND_URL}/login.html?error=google_failed`,
    session: true,
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
    failureRedirect: `${process.env.FRONTEND_URL}/login.html?error=github_failed`,
    session: true,
  }),
  socialAuthSuccess
);

/* ── Identity & Session ──────────────────────────────────── */
router.post('/logout', isAuthenticated, logout);
router.get('/me', isAuthenticated, checkAuth);

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
