import {
  findById,
  findByEmail,
  create,
  verifyPassword,
} from '../models/user.js';
import { query } from '../config/database.js';

/**
 * Get all users (only for TL)
 */
export async function getAllUsers(req, res) {
  try {
    const queryText = `
      SELECT id, email, full_name, role, first_login, created_at 
      FROM users 
      ORDER BY created_at DESC
    `;
    const result = await query(queryText);

    res.json({
      users: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
}

/**
 * Get user by ID
 */
export async function getUserById(req, res) {
  try {
    const { id } = req.params;

    const user = await findById(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        firstLogin: user.first_login,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
}

/**
 * Update user
 */
export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { fullName, email } = req.body;

    // Check if user exists
    const user = await findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is updating their own profile or is TL
    if (req.session.userId !== parseInt(id) && req.session.role !== 'tl') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update your own profile',
      });
    }

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await findByEmail(email);
      if (existingUser && existingUser.id !== parseInt(id)) {
        return res.status(409).json({ error: 'Email already in use' });
      }
    }

    const updates = {};
    if (fullName) updates.full_name = fullName;
    if (email) updates.email = email;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Build dynamic update query
    const fields = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');
    const values = [...Object.values(updates), id];

    const queryText = `
      UPDATE users 
      SET ${fields}
      WHERE id = $${values.length}
      RETURNING id, email, full_name, role, first_login, created_at
    `;

    const result = await query(queryText, values);

    res.json({
      message: 'User updated successfully',
      user: {
        id: result.rows[0].id,
        email: result.rows[0].email,
        fullName: result.rows[0].full_name,
        role: result.rows[0].role,
        firstLogin: result.rows[0].first_login,
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
}

/**
 * Delete user (soft delete or hard delete)
 */
export async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only TL can delete users
    if (req.session.role !== 'tl') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only Team Leaders can delete users',
      });
    }

    // Hard delete (you can change to soft delete if needed)
    const queryText = 'DELETE FROM users WHERE id = $1 RETURNING id';
    const result = await query(queryText, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User deleted successfully',
      userId: result.rows[0].id,
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
}

/**
 * Get users by role (coder or tl)
 */
export async function getUsersByRole(req, res) {
  try {
    const { role } = req.params;

    if (!['coder', 'tl'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const queryText = `
      SELECT id, email, full_name, role, first_login, created_at 
      FROM users 
      WHERE role = $1
      ORDER BY created_at DESC
    `;
    const result = await query(queryText, [role]);

    res.json({
      users: result.rows,
      total: result.rows.length,
      role: role,
    });
  } catch (error) {
    console.error('Get users by role error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
}
