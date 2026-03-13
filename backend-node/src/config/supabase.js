import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL || 'https://ecmruftbjyroyzacujnb.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Service key bypasses RLS

if (!supabaseKey) {
  console.error('[supabase] SUPABASE_SERVICE_KEY not set in .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey);