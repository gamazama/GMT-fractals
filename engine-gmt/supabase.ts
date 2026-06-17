/**
 * Shared Supabase client for GMT — used by both the gallery plugin and the
 * auth plugin. Single instance, lazy-initialized, with session persistence
 * enabled so users stay signed in across reloads.
 *
 * Both env vars are public-safe — Row Level Security on Supabase enforces
 * what the anon role can do.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** localStorage key the supabase client persists the session under. Exported
 *  so the auth store's sign-out fallback can hard-clear it when a failed
 *  server-side revoke leaves the token behind. Keep in sync with the
 *  `storageKey` passed to createClient below. */
export const AUTH_STORAGE_KEY = 'gmt-auth';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
    if (!supabaseEnabled) {
        throw new Error('Supabase: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
    }
    if (!_client) {
        _client = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,    // OAuth callback handling
                storage: typeof window !== 'undefined' ? window.localStorage : undefined,
                storageKey: AUTH_STORAGE_KEY,  // namespaced so it doesn't collide with anything else
            },
        });
    }
    return _client;
}
