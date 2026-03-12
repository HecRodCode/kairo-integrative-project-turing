/**
 * routes/coderRoutes.js
 */
import { Router } from 'express';
import {
  getCoderDashboard, getPlanDetails,
  updateActivityProgress, getModuleMilestones,
  getActivePlan, completeDay, requestPlan,
} from '../controllers/coderControllers.js';
import {
  generateExercise, submitExercise, getSubmissions,
} from '../controllers/exerciseControllers.js';
import {
  searchResources,
} from '../controllers/resourceControllers.js';
import { isAuthenticated, hasRole, checkOnboarding } from '../middlewares/authMiddlewares.js';

const router = Router();
router.use(isAuthenticated, hasRole('coder'), checkOnboarding);

router.get('/dashboard',                             getCoderDashboard);
router.get('/plan',                                  getActivePlan);
router.post('/plan/request',                         requestPlan);
router.post('/plan/:planId/day/:day/complete',       completeDay);
router.get('/plans/:planId',                         getPlanDetails);
router.post('/exercise/generate',                    generateExercise);
router.post('/exercise/:exerciseId/submit',          submitExercise);
router.get('/exercise/:exerciseId/submissions',      getSubmissions);
router.post('/resources/search',                     searchResources);
router.patch('/activities/:id/complete',             updateActivityProgress);
router.get('/milestones',                            getModuleMilestones);

export default router;