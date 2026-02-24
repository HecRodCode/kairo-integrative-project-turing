/**
 * Database Infrastructure Module
 * Manages PostgreSQL connection pooling for Supabase Session Pooler.
 * Optimized for IPv4 network compatibility.
 */

import pkg from 'pg';
import 'dotenv/config';

const { Pool } = pkg;

/**
 * Pool Configuration
 * FIXED: aws-1-us-east-1 cluster connectivity.
 * FIXED: SSL enabled with unauthorized rejection bypass for cloud compatibility.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // Mandatory for Supabase cloud connections
  ssl: {
    rejectUnauthorized: false,
  },

  // Resource Management
  max: 10, // Maximum concurrent connections
  idleTimeoutMillis: 30000, // Close idle clients after 30s
  connectionTimeoutMillis: 10000, // Fail fast if connection takes >10s

  // Query Performance
  statement_timeout: 30000, // Terminate queries exceeding 30s
});

// ============================================
// POOL EVENT LISTENERS
// ============================================

pool.on('connect', () => {
  // Silent in production, useful for debug in dev
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔌 [Database] New client connection established');
  }
});

pool.on('error', (err) => {
  console.error('❌ [Database] Unexpected pool error:', err.message);
  console.error(`   Code: ${err.code} | Detail: ${err.detail || 'None'}`);
});

// ============================================
// QUERY HELPERS
// ============================================

/**
 * Global Query Wrapper
 * Executes SQL commands and monitors execution time.
 */
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔍 [Query] Executed in ${duration}ms`);
    }
    return res;
  } catch (error) {
    console.error(`❌ [Query Error] ${error.message}`);
    throw error;
  }
};

/**
 * Connectivity Handshake
 * Performs a comprehensive check of credentials and cluster status.
 */
export async function testConnection() {
  try {
    const result = await pool.query(
      'SELECT NOW(), current_database(), current_user, version()'
    );

    console.log('------------------------------------------------------------');
    console.log('✅ DATABASE HANDSHAKE SUCCESSFUL');
    console.log('------------------------------------------------------------');
    console.log(`   Instance : ${result.rows[0].current_database}`);
    console.log(`   User     : ${result.rows[0].current_user}`);
    console.log(`   Version  : ${result.rows[0].version.split(' ')[0]}`);
    console.log('------------------------------------------------------------');

    return true;
  } catch (error) {
    console.error(
      '\n------------------------------------------------------------'
    );
    console.error('❌ DATABASE CONNECTION FAILED');
    console.error(
      '------------------------------------------------------------'
    );
    console.error(`   Error Code : ${error.code}`);
    console.error(`   Message    : ${error.message}`);

    // Specific Troubleshooting for Supabase Pooler
    if (error.code === 'XX000') {
      console.error('\n[Diagnostic] "Tenant or user not found" detected.');
      console.error('Checklist:');
      console.error('  1. Use host: aws-1-us-east-1.pooler.supabase.com');
      console.error('  2. Format user as: postgres.PROJECT_ID');
      console.error('  3. Ensure SSL is enabled in connection settings');
    }

    console.error(
      '------------------------------------------------------------\n'
    );
    throw error;
  }
}

export { pool };
