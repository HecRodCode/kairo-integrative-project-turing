/**
 * Riwi Learning Platform - API Gateway
 * Orchestrates authentication, database persistence, and AI microservice communication.
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import morgan from 'morgan';
import { pool } from './config/database.js';

// Route Definitions
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import diagnosticRoutes from './routes/diagnosticRoutes.js';
import aiRoutes from './routes/iaRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Security & Cross-Origin Resource Sharing
 * FIXED: Explicitly added common local development origins.
 */
const allowedOrigins = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://192.168.1.4:5500', // Añadí esta porque la vi en tu captura anterior
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir peticiones sin origen (como Postman o apps móviles)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1 || !isProduction) {
        return callback(null, true);
      } else {
        return callback(new Error('CORS Policy violation'), false);
      }
    },
    credentials: true, // REQUERIDO para cookies de sesión
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

/**
 * Global Middlewares
 */
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Session State Management
 * FIXED: Optimized for local development handshake.
 */
app.use(
  session({
    name: 'riwi.sid', // Nombre personalizado para la cookie
    secret: process.env.SESSION_SECRET || 'fallback_dev_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction, // False en desarrollo (HTTP)
      httpOnly: true,
      maxAge: 86400000,
      sameSite: isProduction ? 'none' : 'lax', // Lax es necesario para desarrollo entre puertos
    },
  })
);

// API Endpoint Mapping
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/diagnostics', diagnosticRoutes);
app.use('/api/ai', aiRoutes);

/**
 * Resource Health Monitoring
 */
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await pool.query('SELECT NOW()');
    res.status(200).json({
      status: 'ok',
      uptime: process.uptime(),
      db_connected: !!dbStatus.rows.length,
    });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

/**
 * Centralized Error Handling
 */
app.use((err, req, res, next) => {
  const status = err.status || 500;
  // Solo loguear si no es un error de CORS para no ensuciar la consola
  if (err.message !== 'CORS Policy violation') {
    console.error(`[System Error] ${err.message}`);
  }

  res.status(status).json({
    error: true,
    message: isProduction ? 'Internal Server Error' : err.message,
  });
});

/**
 * System Bootstrap
 */
async function startServer() {
  try {
    await pool.query('SELECT 1');
    console.log('🔌 Database connectivity verified.');

    app.listen(PORT, () => {
      console.log(
        `🚀 Node.js Gateway active on port ${PORT} [${process.env.NODE_ENV || 'development'}]`
      );
    });
  } catch (error) {
    console.error('❌ Core Failure: Unable to establish database connection.');
    process.exit(1);
  }
}

startServer();
