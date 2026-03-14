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
import connectPg from 'connect-pg-simple';

import authRoutes from './routes/authRoutes.js';
import diagnosticRoutes from './routes/diagnosticRoutes.js';
import coderRoutes from './routes/coderRoutes.js';
import tlRoutes from './routes/tlRoutes.js';
import aiRoutes from './routes/iaRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import profileRoutes from './routes/profileRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;
const PgSession = connectPg(session);
const isProduction = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

/* ════════════════════════════════════════
   CORS
════════════════════════════════════════ */
function toOrigin(url) {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

const ALLOWED_ORIGINS = isProduction
  ? [toOrigin(process.env.FRONTEND_URL)].filter(Boolean)
  : ['http://localhost:5500', 'http://localhost:5173'];

const ALLOW_ALL_ORIGINS = isProduction && ALLOWED_ORIGINS.length === 0;

const _corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (ALLOW_ALL_ORIGINS) {
      console.warn(
        '[CORS] FRONTEND_URL not configured; allowing all origins for now.'
      );
      return callback(null, true);
    }
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    console.warn(
      `[CORS] Blocked origin: ${origin} — allowed: ${ALLOWED_ORIGINS}`
    );
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Set-Cookie'],
};

app.use(cors(_corsOptions));
app.options('/{*path}', cors(_corsOptions));

/* ════════════════════════════════════════
   MIDDLEWARE
════════════════════════════════════════ */
app.use(morgan('dev'));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

/* ════════════════════════════════════════
   SESSION STORE
════════════════════════════════════════ */
const sessionStoreUrl =
  process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL;

const sessionStore = new PgSession({
  conString: sessionStoreUrl,
  tableName: 'session',
  createTableIfMissing: true,
  errorLog: (err) => console.error('[SessionStore]', err.message),
});

/* ════════════════════════════════════════
   SESSION
════════════════════════════════════════ */
app.use(
  session({
    store: sessionStore,
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
app.use('/api/notifications', notificationRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api', assignmentRoutes);

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

/* ════════════════════════════════════════
   ERROR HANDLERS
════════════════════════════════════════ */
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
    console.error('FAILED', error);
    process.exit(1);
  }
}

startServer();
