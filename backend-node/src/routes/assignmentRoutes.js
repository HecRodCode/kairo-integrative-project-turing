/**
 * backend-node/routes/assignmentRoutes.js
 *
 * Mount in app.js:
 *   import assignmentRoutes from './routes/assignmentRoutes.js';
 *   app.use('/api', assignmentRoutes);
 */
import { Router } from 'express';
import multer from 'multer';
import { isAuthenticated, hasRole } from '../middlewares/authMiddlewares.js';
import {
  createAssignment,
  listAssignmentsTL,
  deleteAssignment,
  listAssignmentsCoder,
  getAssignmentDownload,
} from '../controllers/assignmentControllers.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Solo se aceptan archivos PDF.'));
  },
});

/* ── TL ── */
router.post('/tl/assignment',       isAuthenticated, hasRole('tl'), upload.single('file'), createAssignment);
router.get('/tl/assignments',       isAuthenticated, hasRole('tl'), listAssignmentsTL);
router.delete('/tl/assignment/:id', isAuthenticated, hasRole('tl'), deleteAssignment);

/* ── Coder ── */
router.get('/coder/assignments',              isAuthenticated, hasRole('coder'), listAssignmentsCoder);
router.get('/coder/assignment/:id/download',  isAuthenticated, hasRole('coder'), getAssignmentDownload);

export default router;