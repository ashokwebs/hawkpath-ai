import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** null when accounts are not configured: the app then runs in guest mode (local storage). */
export const supabase: SupabaseClient | null = url && anon ? createClient(url, anon) : null;
export const authEnabled = Boolean(supabase);
