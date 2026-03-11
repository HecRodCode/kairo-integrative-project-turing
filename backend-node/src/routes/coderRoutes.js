/**
 * routes/coderRoutes.js
 * Rutas del coder — Kairo Project.
 */

import { Router } from 'express';
import {
  getCoderDashboard,
  getPlanDetails,
  updateActivityProgress,
  getModuleMilestones,
} from '../controllers/coderControllers.js';
import {
  isAuthenticated,
  hasRole,
  checkOnboarding,
} from '../middlewares/authMiddlewares.js';

const router = Router();

/* Todas las rutas del coder requieren sesión activa + rol coder + onboarding completo */
router.use(isAuthenticated, hasRole('coder'), checkOnboarding);

/* Dashboard principal */
router.get('/dashboard', getCoderDashboard);

/* Planes de aprendizaje */
router.get('/plans/:planId', getPlanDetails);

/* Progreso de actividades */
router.patch('/activities/:id/complete', updateActivityProgress);

/* Hitos del módulo */
router.get('/milestones', getModuleMilestones);

export default router;
