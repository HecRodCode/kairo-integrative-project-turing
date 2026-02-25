import { Router } from 'express';
import {
  getAllCodersByClan,
  getCoderFullDetail,
  submitFeedback,
  getRiskReports,
  getClanMetrics,
} from '../controllers/tlControllers.js';
import { isAuthenticated, hasRole } from '../middlewares/authMiddlewares.js';

const router = Router();

router.get(
  '/coders/clan/:clan_id',
  isAuthenticated,
  hasRole('tl'),
  getAllCodersByClan
);
router.get(
  '/metrics/clan/:clan_id',
  isAuthenticated,
  hasRole('tl'),
  getClanMetrics
);

router.get(
  '/coder/:id/details',
  isAuthenticated,
  hasRole('tl'),
  getCoderFullDetail
);

router.post('/feedback', isAuthenticated, hasRole('tl'), submitFeedback);
router.get('/risk-flags', isAuthenticated, hasRole('tl'), getRiskReports);

export default router;
