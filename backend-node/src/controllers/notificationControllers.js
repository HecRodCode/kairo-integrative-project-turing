/**
 * backend-node/src/controllers/notificationControllers.js
 */

import { query } from '../config/database.js';
import { addClient, removeClient } from '../services/notificationService.js';

function parsePagination(queryParams, defaultLimit = 30, maxLimit = 100) {
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(queryParams.limit, 10) || defaultLimit)
  );
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

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
    Connection: 'keep-alive',
  });

  // Keep-alive formatting (some proxies/hosts close idle SSE connections)
  res.write(': connected\n\n');

  // Send a ping message to keep the connection alive in case of network timeouts
  const keepAlive = setInterval(() => {
    res.write(': ping\n\n');
  }, 15_000);

  // Register client
  addClient(userId, res);
  // console.log(`[SSE] User ${userId} connected. Total active sessions: ${clients.get(userId).length}`);

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(keepAlive);
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
    const { page, limit, offset } = parsePagination(req.query, 30, 100);

    const countResult = await query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE is_read = false)::int AS unread
       FROM notifications
       WHERE user_id = $1`,
      [user.id]
    );

    const total = countResult.rows[0]?.total || 0;
    const unread = countResult.rows[0]?.unread || 0;

    const result = await query(
      `SELECT *
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [user.id, limit, offset]
    );

    res.json({
      notifications: result.rows,
      unread,
      pagination: {
        page,
        limit,
        total,
        hasMore: offset + result.rows.length < total,
      },
    });
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
      return res
        .status(404)
        .json({ error: 'Notificación no encontrada o no tienes permisos.' });
    }

    res.json({ success: true, deletedId: id });
  } catch (err) {
    console.error('[deleteNotification]', err);
    res.status(500).json({ error: 'Error al eliminar la notificación.' });
  }
}
