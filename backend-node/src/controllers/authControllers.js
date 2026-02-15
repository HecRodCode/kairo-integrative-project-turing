import {
  findByEmail,
  create,
  verifyPassword,
  findById,
} from '../models/user.js';
import { validateEmail, validatePassword } from '../utils/validators.js';

export async function register(req, res) {
  try {
    const { email, password, fullName, role } = req.body;

    // Validation
    if (!email || !password || !fullName || !role) {
      return res.status(400).json({
        error: 'All fields are required',
        fields: ['email', 'password', 'fullName', 'role'],
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long',
      });
    }

    if (!['coder', 'tl'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role. Must be "coder" or "tl"',
      });
    }

    // Check if user already exists
    const existingUser = await findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Create user
    const newUser = await create({ email, password, fullName, role });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.full_name,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
      });
    }

    // Find user
    const user = await findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create session
    req.session.userId = user.id;
    req.session.role = user.role;

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        firstLogin: user.first_login,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
}

export async function logout(req, res) {
  try {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.clearCookie('connect.sid');
      res.json({ message: 'Logout successful' });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
}

export async function getCurrentUser(req, res) {
  try {
    const user = await findById(req.session.userId);

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
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user data' });
  }
}

export async function checkAuth(req, res) {
  if (req.session.userId) {
    res.json({ authenticated: true, role: req.session.role });
  } else {
    res.json({ authenticated: false });
  }
}
