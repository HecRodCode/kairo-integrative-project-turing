import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// GET connection details from environment variables
const supabaseUrl =
  process.env.SUPABASE_URL || 'https://ecmruftbjyroyzacujnb.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// VALIDATE that service key exists before initializing
if (!supabaseKey) {
  console.error('[supabase] SUPABASE_SERVICE_KEY not set in .env');
}

// INITIALIZE and export the Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseKey);
