import {
  getDashboardData,
  submitFeedback,
  getSubmissions,
  reviewSubmission,
  getCoderScoreHistory,
  getScoreRanking,
} from '../controllers/tlControllers.js';
import {
  uploadResource,
  listResources,
  deleteResource,
} from '../controllers/resourceControllers.js';
import { isAuthenticated, hasRole } from '../middlewares/authMiddlewares.js';
import { Router } from 'express';
import multer from 'multer';

const router = Router();
router.use(isAuthenticated, hasRole('tl'));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype === 'application/pdf'),
});

router.get('/dashboard', getDashboardData);
router.post('/feedback', submitFeedback);
router.get('/submissions', getSubmissions);
router.post('/submissions/:id/review', reviewSubmission);
router.get('/coder/:id/score', getCoderScoreHistory);
router.post('/resource/upload', upload.single('file'), uploadResource);
router.get('/resource/list', listResources);
router.delete('/resource/:resourceId', deleteResource);
router.get('/ranking', getScoreRanking);

export default router;
