/**
 * Database Configuration Module
 * Manages the PostgreSQL connection pool using the 'pg' library.
 * Designed for secure connectivity with Supabase or other cloud providers.
 */

import pkg from 'pg';
import 'dotenv/config';

const { Pool } = pkg;

/**
 * Connection Configuration
 * Uses a single Connection String (DATABASE_URL) for reliability.
 * SSL is required for cloud-hosted instances like Supabase.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    // Required for Supabase cloud connections to avoid handshake errors
    rejectUnauthorized: false,
  },
  // Pool management settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Event Listeners
 * Monitors pool activity and unexpected failures.
 */
pool.on('connect', () => {
  console.log('🔌 Database connection established successfully');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error on idle client:', err.message);
});

/**
 * Exported Query Helper
 * Facilitates executing queries throughout the application.
 */
export const query = (text, params) => pool.query(text, params);
export { pool };
