/**
 * app.js — Kairo API Gateway
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import morgan from 'morgan';
import passport from './config/passport.js';
import { pool, testConnection } from './config/database.js';
import { connectMongo } from './config/mongodb.js';

import authRoutes from './routes/authRoutes.js';
import diagnosticRoutes from './routes/diagnosticRoutes.js';
import coderRoutes from './routes/coderRoutes.js';
import tlRoutes from './routes/tlRoutes.js';
import aiRoutes from './routes/iaRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

/* ════════════════════════════════════════
   CORS - FIX DINÁMICO
════════════════════════════════════════ */
const ALLOWED_ORIGINS = isProduction
  ? [process.env.FRONTEND_URL].filter(Boolean)
  : ['http://localhost:5500'];

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Set-Cookie'],
  })
);

// Respond to ALL preflight requests immediately
app.options('/:path', cors());

/* ── Standard middleware ── */
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ════════════════════════════════════════
   SESSION
   sameSite: 'lax'  → correct for dev cross-origin fetches with credentials
   secure: false    → required in dev (http), true in prod (https)
════════════════════════════════════════ */
app.use(
  session({
    name: 'riwi.sid',
    secret: process.env.SESSION_SECRET || 'dev_secret_fallback',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction, // false in dev
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 h
      sameSite: isProduction ? 'none' : 'lax',
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

/* ════════════════════════════════════════
   ROUTES
════════════════════════════════════════ */
app.use('/api/auth', authRoutes);
app.use('/api/diagnostics', diagnosticRoutes);
app.use('/api/coder', coderRoutes);
app.use('/api/tl', tlRoutes);
app.use('/api/ai', aiRoutes);

app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'active',
      uptime: process.uptime(),
      database: { connected: true, timestamp: result.rows[0].now },
    });
  } catch (error) {
    res.status(503).json({ status: 'unstable', error: error.message });
  }
});

app.use((req, res) => res.status(404).json({ error: 'Endpoint not found' }));

app.use((err, req, res, next) => {
  const status = err.status || 500;
  console.error(`[System Error] ${err.stack}`);
  res.status(status).json({
    error: true,
    message: isProduction ? 'Internal Server Error' : err.message,
  });
});

/* ════════════════════════════════════════
   BOOTSTRAP
════════════════════════════════════════ */
async function startServer() {
  try {
    process.stdout.write('🔄 Initializing Kairo services... ');

    await testConnection();
    await connectMongo();

    if (!process.env.RESEND_API_KEY) {
      throw new Error('MAILER: RESEND_API_KEY is missing in .env');
    }

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
      console.log(`🌐 Origins  : ${ALLOWED_ORIGINS.join(', ')}`);
      console.log(`🛠️  ENV      : ${process.env.NODE_ENV || 'development'}`);
      console.log(
        '------------------------------------------------------------'
      );
    });
  } catch (error) {
    // Aquí es donde el servidor se detiene y te chismea qué pasó
    console.log('FAILED');
    console.log('------------------------------------------------------------');
    console.log('❌ CRITICAL ERROR DURING BOOTSTRAP');
    console.log('------------------------------------------------------------');
    console.log(`👉 TYPE    : ${error.name}`);
    console.log(`👉 MESSAGE : ${error.message}`);

    // Si el error tiene stack, te da la línea exacta para que no busques a ciegas
    if (error.stack) {
      const line = error.stack.split('\n')[1].trim();
      console.log(`👉 LOCATION: ${line}`);
    }

    console.log('------------------------------------------------------------');
    process.exit(1);
  }
}
startServer();
