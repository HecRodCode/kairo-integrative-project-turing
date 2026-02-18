import { Router } from 'express';
import { generatePlan, checkAiHealth } from '../controllers/iaControllers.js';
import { isAuthenticated, hasRole } from '../middlewares/authMiddlewares.js';

const router = Router();

// Generate personalized plan (coders only)
router.post('/generate-plan', isAuthenticated, hasRole('coder'), generatePlan);

// Health check for Python API
router.get('/health', isAuthenticated, checkAiHealth);

export default router;
