/**
 * routes/exerciseRoutes.js
 */
import { Router } from 'express';
import {
  generateExercise,
  submitExercise,
  getSubmissions,
} from '../controllers/exerciseControllers.js';
import {
  isAuthenticated,
  hasRole,
  checkOnboarding,
} from '../middlewares/authMiddlewares.js';

const router = Router();
router.use(isAuthenticated, hasRole('coder'), checkOnboarding);

router.post('/generate', generateExercise);
router.post('/:exerciseId/submit', submitExercise);
router.get('/:exerciseId/submissions', getSubmissions);

export default router;
