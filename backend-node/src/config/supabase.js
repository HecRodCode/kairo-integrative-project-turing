import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    '[supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);