import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Server-only admin client using the service-role key.
 *
 * The service-role key BYPASSES RLS and must never reach the browser.
 * Importing this module from a client component fails at build time via
 * the `server-only` guard.
 *
 * Only use this client for operations that genuinely require elevated
 * privileges (e.g. seed defaults, cross-user system jobs, migrations).
 * Normal user operations must use the authenticated server client
 * (`@/lib/supabase/server`) so RLS applies.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    getSupabaseUrl(),
    getSupabaseServiceRoleKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}