/**
 * backend-node/src/controllers/notificationControllers.js
 */

import { query } from '../config/database.js';
import { addClient, removeClient } from '../services/notificationService.js';

/**
 * ESTABLISH SSE CONNECTION
 * GET /api/notifications/stream
 */
export function streamNotifications(req, res) {
  const userId = req.user.id;

  // SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Keep-alive formatting
  res.write(': connected\n\n');

  // Register client
  addClient(userId, res);
  // console.log(`[SSE] User ${userId} connected. Total active sessions: ${clients.get(userId).length}`);

  // Handle client disconnect
  req.on('close', () => {
    removeClient(userId, res);
    // console.log(`[SSE] User ${userId} disconnected.`);
  });
}

/**
 * GET INITIAL NOTIFICATIONS AND UNREAD COUNT
 * GET /api/notifications
 */
export async function getNotifications(req, res) {
  try {
    const user = req.user;
    const result = await query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30`,
      [user.id]
    );
    const unread = result.rows.filter((n) => !n.is_read).length;
    res.json({ notifications: result.rows, unread });
  } catch (err) {
    console.error('[getNotifications]', err);
    res.status(500).json({ error: 'Error al cargar notificaciones.' });
  }
}

/**
 * MARK ALL NOTIFICATIONS AS READ
 * POST /api/notifications/read
 */
export async function markNotificationsRead(req, res) {
  try {
    await query(`UPDATE notifications SET is_read = true WHERE user_id = $1`, [
      req.user.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error('[markNotificationsRead]', err);
    res.status(500).json({ error: 'Error.' });
  }
}

/**
 * DELETE A SPECIFIC NOTIFICATION
 * DELETE /api/notifications/:id
 */
export async function deleteNotification(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada o no tienes permisos.' });
    }

    res.json({ success: true, deletedId: id });
  } catch (err) {
    console.error('[deleteNotification]', err);
    res.status(500).json({ error: 'Error al eliminar la notificación.' });
  }
}
