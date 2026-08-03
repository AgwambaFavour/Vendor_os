import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env and fill it in.'
  );
}

// Service role key is used because this runs as a trusted backend process,
// not a browser client — it bypasses row-level security by design.
// Never expose this key to the dashboard frontend; the dashboard should
// call your backend API, not Supabase directly, until you add proper
// user-scoped auth.
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
