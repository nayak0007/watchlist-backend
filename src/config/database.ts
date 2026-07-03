import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';
import { logger } from '../utils/logger';

let supabaseAdmin: SupabaseClient | null = null;

/**
 * Get or initialize the Supabase admin client (uses service_role key).
 * This client bypasses RLS and should only be used on the server.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    logger.info('Supabase admin client initialized');
  }
  return supabaseAdmin;
}

/**
 * Get the Supabase anon client (respects RLS).
 * Useful for public operations that don't need admin privileges.
 */
let supabaseAnon: SupabaseClient | null = null;

export function getSupabaseAnon(): SupabaseClient {
  if (!supabaseAnon) {
    supabaseAnon = createClient(env.supabaseUrl, env.supabaseAnonKey);
    logger.info('Supabase anon client initialized');
  }
  return supabaseAnon;
}

/**
 * Verify a Supabase JWT and return the user.
 * Used by the auth middleware to authenticate requests.
 */
export async function verifySupabaseToken(token: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return data.user;
}
