import { Router } from 'express';
import {
  createDiagnostic,
  getDiagnosticByCoderId,
  updateDiagnostic,
  getAllDiagnostics,
} from '../controllers/diagnosticControllers.js';
import { isAuthenticated, hasRole } from '../middlewares/authMiddlewares.js';

const router = Router();

// Create or update diagnostic (coders only)
router.post('/', isAuthenticated, hasRole('coder'), createDiagnostic);

// Get diagnostic by coder ID
router.get('/:coderId', isAuthenticated, getDiagnosticByCoderId);

// Update diagnostic
router.put('/:coderId', isAuthenticated, hasRole('coder'), updateDiagnostic);

// Get all diagnostics (only TL)
router.get('/all/list', isAuthenticated, hasRole('tl'), getAllDiagnostics);

export default router;
