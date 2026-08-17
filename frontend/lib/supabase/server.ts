import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Authenticated server-side Supabase client.
 *
 * Uses the anon key + the request's auth cookies, so all reads/writes
 * are governed by Postgres RLS for the signed-in user. This is the
 * DEFAULT client for normal user operations. Create a fresh client per
 * request; never share across requests.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component, so it's safe to ignore when
          // middleware refreshes sessions.
        }
      },
    },
  });
}