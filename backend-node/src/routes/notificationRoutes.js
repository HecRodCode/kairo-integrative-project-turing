/**
 * backend-node/src/routes/notificationRoutes.js
 *
 * Mount in server.js:
 *   import notificationRoutes from './routes/notificationRoutes.js';
 *   app.use('/api/notifications', notificationRoutes);
 */

import { Router } from 'express';
import { isAuthenticated } from '../middlewares/authMiddlewares.js';
import {
  streamNotifications,
  getNotifications,
  markNotificationsRead,
  deleteNotification
} from '../controllers/notificationControllers.js';

const router = Router();

// Require auth for all notification routes
router.use(isAuthenticated);

// SSE stream endpoint
router.get('/stream', streamNotifications);

// REST endpoints
router.get('/', getNotifications);
router.post('/read', markNotificationsRead);
router.delete('/:id', deleteNotification);

export default router;
