/**
 * controllers/notificationControllers.js
 * Handles SSE stream + REST CRUD for notifications.
 */

import { query } from '../config/database.js';
import { addClient } from '../services/notificationService.js';

/* ════════════════════════════════════════
   SSE STREAM
   GET /api/notifications/stream
════════════════════════════════════════ */
export function streamNotifications(req, res) {
  const userId = req.user?.id || req.session?.userId;
  if (!userId) return res.status(401).end();

  // SSE headers — X-Accel-Buffering: no is critical for Railway/nginx proxies
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Confirm connection to client immediately
  res.write('data: {"type":"CONNECTED"}\n\n');

  // Register client — addClient returns cleanup function
  const cleanup = addClient(userId, res);

  // Clean up when client disconnects (tab close, navigation, etc.)
  req.on('close', cleanup);
}

/* ════════════════════════════════════════
   GET NOTIFICATIONS
   GET /api/notifications
════════════════════════════════════════ */
export async function getNotifications(req, res) {
  const userId = req.user?.id || req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const result = await query(
      `SELECT id, title, message, type, is_read, related_id, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 30`,
      [userId]
    );

    const unread = result.rows.filter((n) => !n.is_read).length;

    return res.json({
      notifications: result.rows,
      unread,
    });
  } catch (err) {
    console.error('[getNotifications]', err.message);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

/* ════════════════════════════════════════
   MARK ALL AS READ
   POST /api/notifications/read
════════════════════════════════════════ */
export async function markNotificationsRead(req, res) {
  const userId = req.user?.id || req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    await query(
      `UPDATE notifications SET is_read = true
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('[markNotificationsRead]', err.message);
    return res
      .status(500)
      .json({ error: 'Failed to mark notifications as read' });
  }
}

/* ════════════════════════════════════════
   DELETE NOTIFICATION
   DELETE /api/notifications/:id
════════════════════════════════════════ */
export async function deleteNotification(req, res) {
  const userId = req.user?.id || req.session?.userId;
  const { id } = req.params;

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const result = await query(
      `DELETE FROM notifications
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Notification not found' });

    return res.json({ success: true });
  } catch (err) {
    console.error('[deleteNotification]', err.message);
    return res.status(500).json({ error: 'Failed to delete notification' });
  }
}
