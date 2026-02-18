import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUsersByRole,
} from '../controllers/userControllers.js';
import { isAuthenticated, hasRole } from '../middlewares/authMiddlewares.js';

const router = Router();

// Get all users (only TL)
router.get('/', isAuthenticated, hasRole('tl'), getAllUsers);

// Get users by role (only TL)
router.get('/role/:role', isAuthenticated, hasRole('tl'), getUsersByRole);

// Get user by ID
router.get('/:id', isAuthenticated, getUserById);

// Update user
router.put('/:id', isAuthenticated, updateUser);

// Delete user (only TL)
router.delete('/:id', isAuthenticated, hasRole('tl'), deleteUser);

export default router;
