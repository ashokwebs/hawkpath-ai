/**
 * Verifies a Supabase access token (JWT) server-side. Signed-in members get a
 * higher rate-limit tier and are keyed by user id instead of IP.
 * Never trusts a user id sent in the body: identity comes only from the verified token.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let sb: SupabaseClient | null = null;
const cache = new Map<string, { userId: string; exp: number }>();

function client(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  sb ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return sb;
}

export async function verifyUser(authHeader: string | undefined | null): Promise<{ userId: string } | null> {
  const m = String(authHeader ?? '').match(/^Bearer\s+([A-Za-z0-9._-]{20,4096})$/);
  if (!m) return null;
  const token = m[1];
  const hit = cache.get(token);
  if (hit && hit.exp > Date.now()) return { userId: hit.userId };
  const c = client();
  if (!c) return null;
  try {
    const { data, error } = await c.auth.getUser(token);
    if (error || !data.user) return null;
    cache.set(token, { userId: data.user.id, exp: Date.now() + 60_000 });
    if (cache.size > 2000) cache.clear();
    return { userId: data.user.id };
  } catch {
    return null;
  }
}
