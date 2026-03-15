/**
 * services/notificationService.js
 */
import { query } from '../config/database.js';

const clients = new Map();
const MAX_CONNECTIONS_PER_USER = 3;

export function addClient(userId, res) {
  if (!clients.has(userId)) clients.set(userId, []);
  const userClients = clients.get(userId);

  if (userClients.length >= MAX_CONNECTIONS_PER_USER) {
    const oldest = userClients.shift();
    clearInterval(oldest.heartbeatInterval);
    try {
      oldest.res.end();
    } catch {
      // ignore close errors
    }
  }

  const heartbeatInterval = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      removeClient(userId, res, heartbeatInterval);
    }
  }, 25000);

  userClients.push({ res, heartbeatInterval });

  return () => removeClient(userId, res, heartbeatInterval);
}

export function removeClient(userId, res, heartbeatInterval) {
  clearInterval(heartbeatInterval);

  if (!clients.has(userId)) return;

  const updated = clients.get(userId).filter((c) => c.res !== res);
  if (updated.length === 0) {
    clients.delete(userId);
  } else {
    clients.set(userId, updated);
  }
}

export function sendToUser(userId, payload) {
  if (!clients.has(userId)) return;

  const dataString = `data: ${JSON.stringify(payload)}\n\n`;
  const userClients = clients.get(userId);

  userClients.forEach(({ res }) => {
    try {
      res.write(dataString);
    } catch (err) {
      console.warn(
        `[notificationService] Write falló para user ${userId}:`,
        err.message
      );
    }
  });
}

export async function notifyUser(
  userId,
  title,
  message,
  type = 'system',
  relatedId = null
) {
  try {
    const result = await query(
      `INSERT INTO notifications (user_id, title, message, type, related_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, title, message, type, relatedId]
    );

    const notification = result.rows[0];

    sendToUser(userId, {
      type: 'NEW_NOTIFICATION',
      data: notification,
    });

    return notification;
  } catch (error) {
    console.error('[notificationService] notifyUser failed:', error.message);
    throw error;
  }
}
