/**
 * Riwi Learning Platform - Kairo API Gateway
 * Core orchestrator for authentication, persistence, and AI services.
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import morgan from 'morgan';
import { pool, testConnection } from './config/database.js';

// Optimized Route Definitions
import authRoutes from './routes/authRoutes.js'; 
import diagnosticRoutes from './routes/diagnosticRoutes.js'; 
import coderRoutes from './routes/coderRoutes.js'; 
import tlRoutes from './routes/tlRoutes.js';
import aiRoutes from './routes/iaRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// MIDDLEWARE CONFIGURATION
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5500',
    credentials: true,
  })
);

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Session State Management
 * Securely handles user identity across the platform.
 */
app.use(
  session({
    name: 'riwi.sid',
    secret: process.env.SESSION_SECRET || 'dev_secret_fallback',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: isProduction ? 'none' : 'lax',
    },
  })
);


// API ROUTING - RESTFUL ENDPOINTS
app.use('/api/auth', authRoutes); 
app.use('/api/diagnostics', diagnosticRoutes);
app.use('/api/coder', coderRoutes); 
app.use('/api/tl', tlRoutes);
app.use('/api/ai', aiRoutes);

/**
 * Global Health Check
 * Monitors system uptime and database connectivity.
 */
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'active',
      uptime: process.uptime(),
      database: {
        connected: true,
        timestamp: result.rows[0].now,
      },
    });
  } catch (error) {
    res.status(503).json({ status: 'unstable', error: error.message });
  }
});

// Error Handling: 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error Handling: Global Exception Filter
app.use((err, req, res, next) => {
  const status = err.status || 500;
  console.error(`[System Error] ${err.stack}`);
  res.status(status).json({
    error: true,
    message: isProduction ? 'Internal Server Error' : err.message,
  });
});

// SERVER BOOTSTRAP
async function startServer() {
  try {
    process.stdout.write('🔄 Initializing Kairo services... ');

    // Database Handshake
    await testConnection();

    app.listen(PORT, '0.0.0.0', () => {
      console.log('DONE');
      console.log(
        '------------------------------------------------------------'
      );
      console.log('🚀 KAIRO API GATEWAY STARTED SUCCESSFULLY');
      console.log(
        '------------------------------------------------------------'
      );
      console.log(`📡 URL      : http://localhost:${PORT}`);
      console.log(`🛠️  ENV      : ${process.env.NODE_ENV || 'development'}`);
      console.log(
        '------------------------------------------------------------'
      );
    });
  } catch (error) {
    console.error('FAILED');
    process.exit(1);
  }
}

startServer();