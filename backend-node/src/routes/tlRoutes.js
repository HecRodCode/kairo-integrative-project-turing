/**
 * routes/tlRoutes.js
 *
 * FIXES:
 *  - getDashboard → getDashboardData (nombre correcto del export)
 *  - POST /feedback agregado (faltaba, dashboardTL.js lo llama)
 *  - multer para upload de PDFs
 */
import { Router } from 'express';
import multer from 'multer';
import {
  getDashboardData,
  submitFeedback,
} from '../controllers/tlControllers.js';
import {
  uploadResource,
  listResources,
  deleteResource,
} from '../controllers/resourceControllers.js';
import { isAuthenticated, hasRole } from '../middlewares/authMiddlewares.js';

const router = Router();

router.get('/dashboard', isAuthenticated, hasRole('tl'), getDashboardData);

router.get('/coders/clan/:clan_id', isAuthenticated, hasRole('tl'), getAllCodersByClan);

router.get('/metrics/clan/:clan_id', isAuthenticated, hasRole('tl'), getClanMetrics);
router.use(isAuthenticated, hasRole('tl'));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype === 'application/pdf');
  },
});

router.get('/coder/:id/details', isAuthenticated, hasRole('tl'), getCoderFullDetail);

router.post('/feedback', isAuthenticated, hasRole('tl'), submitFeedback);
router.get('/risk-flags', isAuthenticated, hasRole('tl'), getRiskReports);
router.get('/dashboard', getDashboardData);
router.post('/feedback', submitFeedback);
router.post('/resource/upload', upload.single('file'), uploadResource);
router.get('/resource/list', listResources);
router.delete('/resource/:resourceId', deleteResource);

export default router;
