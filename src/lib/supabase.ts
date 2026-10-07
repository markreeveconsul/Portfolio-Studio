import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

// Missing configuration must never silently switch to fake authentication.
export const supabase = url && key ? createClient(url, key) : null;
