import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Browser-side Supabase client.
 *
 * Uses the anon key, so all reads/writes are governed by Postgres RLS.
 * Never place a service-role key in this file or any client module.
 */
export function createClient() {
  return createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey());
}