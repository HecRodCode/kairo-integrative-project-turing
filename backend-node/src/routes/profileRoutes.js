import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/profileControllers.js';
import { isAuthenticated } from '../middlewares/authMiddlewares.js';

const router = Router();

// Base path: /api/profile
router.get('/', isAuthenticated, getProfile);
router.get('/:id', isAuthenticated, getProfile); // For TL to view coder profiles
router.post('/update', isAuthenticated, updateProfile);

export default router;
