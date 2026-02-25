import { Router } from 'express';
import {
  register,
  login,
  checkAuth,
  logout,
  getCurrentUser,
  updateFirstLoginStatus,
  updateUserProfile,
} from '../controllers/authControllers.js';
import { isAuthenticated } from '../middlewares/authMiddlewares.js';

const router = Router();

/**
 * Public authentication endpoints
 */
router.post('/register', register);
router.post('/login', login);
router.get('/check', checkAuth);

/**
 * Protected user profile endpoints
 */
router.post('/logout', isAuthenticated, logout);
router.get('/me', isAuthenticated, getCurrentUser);
router.put('/update-profile', isAuthenticated, updateUserProfile);

/**
 * Onboarding status update for coders
 */
router.patch('/complete-onboarding', isAuthenticated, updateFirstLoginStatus);

export default router;
