/**
 * backend-node/src/services/notificationService.js
 * Manages Server-Sent Events (SSE) connections and dispatches real-time notifications.
 */

import { query } from '../config/database.js';

// Map of userId -> Array of Express response objects (SSE connections)
const clients = new Map();

/**
 * Add a new SSE connection for a user.
 * @param {string|number} userId
 * @param {object} res - Express response object
 */
export function addClient(userId, res) {
  if (!clients.has(userId)) {
    clients.set(userId, []);
  }
  clients.get(userId).push(res);
}

/**
 * Remove an SSE connection.
 * @param {string|number} userId
 * @param {object} res - Express response object
 */
export function removeClient(userId, res) {
  if (clients.has(userId)) {
    const userClients = clients.get(userId);
    const updatedClients = userClients.filter(client => client !== res);
    if (updatedClients.length === 0) {
      clients.delete(userId);
    } else {
      clients.set(userId, updatedClients);
    }
  }
}

/**
 * Send an event payload to all open connections of a specific user.
 * @param {string|number} userId
 * @param {object} payload
 */
export function sendToUser(userId, payload) {
  if (clients.has(userId)) {
    const userClients = clients.get(userId);
    const dataString = `data: ${JSON.stringify(payload)}\n\n`;
    userClients.forEach(res => {
      res.write(dataString);
    });
  }
}

/**
 * Inserts a notification into the DB and dispatches it via SSE if the user is online.
 * @param {number} userId 
 * @param {string} title 
 * @param {string} message 
 * @param {string} type 
 * @param {number|null} relatedId 
 */
export async function notifyUser(userId, title, message, type = 'system', relatedId = null) {
  try {
    // 1. Insert into DB
    const result = await query(
      `INSERT INTO notifications (user_id, title, message, type, related_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, title, message, type, relatedId]
    );
    const newNotification = result.rows[0];

    // 2. Dispatch via SSE
    sendToUser(userId, {
      type: 'NEW_NOTIFICATION',
      data: newNotification
    });

    return newNotification;
  } catch (error) {
    console.error('[notificationService] Failed to notify user:', error);
    throw error;
  }
}
