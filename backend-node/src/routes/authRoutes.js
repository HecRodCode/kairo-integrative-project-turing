import { Router } from 'express';
import {
  register,
  login,
  checkAuth,
  logout,
  getCurrentUser,
} from '../controllers/authControllers.js';
import { isAuthenticated } from '../middlewares/authMiddlewares.js';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.get('/check', checkAuth);

// Protected routes
router.post('/logout', isAuthenticated, logout);
router.get('/me', isAuthenticated, getCurrentUser);

export default router;
