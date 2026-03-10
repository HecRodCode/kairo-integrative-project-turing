/**
 * backend-node/routes/iaRoutes.js
 */
import { Router } from 'express';
import {
  generatePlan,
  generateFocusCards,
  generateReport,
  checkAiHealth,
} from '../controllers/iaControllers.js';
import { isAuthenticated, hasRole } from '../middlewares/authMiddlewares.js';

const router = Router();

router.use(isAuthenticated);

router.post('/generate-plan', hasRole('coder'), generatePlan);
router.post('/generate-focus-cards', hasRole('coder'), generateFocusCards);
router.post('/generate-report', hasRole('tl'), generateReport);
router.get('/health', checkAiHealth);

export default router;
