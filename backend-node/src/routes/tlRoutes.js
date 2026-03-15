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
  getAllCodersByClan,
  getClanMetrics,
  getCoderFullDetail,
  getRiskReports,
} from '../controllers/tlControllers.js';
import {
  uploadResource,
  listResources,
  deleteResource,
} from '../controllers/resourceControllers.js';
import { isAuthenticated, hasRole } from '../middlewares/authMiddlewares.js';

const router = Router();
router.use(isAuthenticated, hasRole('tl'));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype === 'application/pdf');
  },
});

router.get('/dashboard', getDashboardData);
router.get('/coders/clan/:clan_id', getAllCodersByClan);
router.get('/metrics/clan/:clan_id', getClanMetrics);
router.get('/coder/:id/details', getCoderFullDetail);
router.get('/risk-flags', getRiskReports);
router.post('/feedback', submitFeedback);
router.post('/resource/upload', upload.single('file'), uploadResource);
router.get('/resource/list', listResources);
router.delete('/resource/:resourceId', deleteResource);

export default router;
