// services/supabaseClient.ts
// Single Supabase client instance for the entire app

import { createClient } from '@supabase/supabase-js';

// Reference each var by its literal `import.meta.env.VITE_*` name so Vite
// statically inlines ONLY these keys — not the whole env object (which would
// drag in any other VITE_-prefixed secret).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
