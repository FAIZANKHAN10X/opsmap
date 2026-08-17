/**
 * Frontend environment accessors.
 * Public values must use the NEXT_PUBLIC_ prefix.
 * Server-only values (service-role key) must never be exposed to the browser.
 */

export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL. Add it to frontend/.env.local"
    );
  }
  return url;
}

/**
 * True when the public Supabase credentials are present. Used by login/dashboard
 * gates to render gracefully when a project isn't configured yet, instead of
 * throwing from the accessor helpers below.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. Add it to frontend/.env.local"
    );
  }
  return key;
}

/**
 * Server-only. The service-role key bypasses RLS and must never be
 * shipped to the browser or used as the default database client.
 * Throws if referenced from a client module (non-NEXT_PUBLIC var).
 */
export function getSupabaseServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Add it to frontend/.env.local"
    );
  }
  return key;
}