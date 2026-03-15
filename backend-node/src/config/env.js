import 'dotenv/config';

const REQUIRED_IN_PRODUCTION = [
  'SESSION_SECRET',
  'DATABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'FRONTEND_URL',
];

export function validateEnv({ isProduction = false } = {}) {
  const missing = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]);

  if (missing.length === 0) return;

  const msg = `[env] Missing variables: ${missing.join(', ')}`;

  if (isProduction) {
    throw new Error(msg);
  }

  console.warn(`${msg} (allowed in development)`);
}
