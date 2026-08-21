"use server";

/**
 * Settings server actions (Phase 4).
 *
 * Read-only integration status probes. Supabase connection/credentials are
 * deployment/bootstrap configuration (environment variables) — the app does
 * NOT support switching its foundational database at runtime. This action
 * reports the *configured* state safely: it never returns anon/service-role
 * keys or any secret, only the public project URL and connectivity probes
 * performed server-side against the authenticated client.
 */

import { getSupabaseUrl, isSupabaseConfigured } from "@/lib/env";
import { STORAGE_BUCKET_DOCUMENTS } from "@/lib/server/constants";
import { withServerContext } from "@/lib/server/action-context";
import { requireRole } from "@/lib/server/authorize";

export type SupabaseIntegrationStatus = {
  configured: boolean;
  /** Public project URL (NEXT_PUBLIC_* — safe to display). Null when unconfigured. */
  url: string | null;
  /** Always "environment": Supabase is bound at build/deploy time. */
  configSource: "environment";
  environment: string;
  /** Authenticated read probe against the database succeeded. */
  database: boolean;
  /** Storage API reachable and returned buckets. */
  storage: boolean;
  /** The `documents` bucket exists in the configured project. */
  documentsBucket: boolean;
  /** A signed-in session could be resolved (auth configured and working). */
  auth: boolean;
  checkedAt: string;
};

export async function getSupabaseIntegrationStatus() {
  if (!isSupabaseConfigured()) {
    return {
      success: true,
      data: {
        configured: false,
        url: null,
        configSource: "environment",
        environment: process.env.NODE_ENV ?? "development",
        database: false,
        storage: false,
        documentsBucket: false,
        auth: false,
        checkedAt: new Date().toISOString(),
      } satisfies SupabaseIntegrationStatus,
      message: null,
    };
  }

  const ctx = await withServerContext();
  requireRole(ctx.actor, "viewer", "view", "integration status");
  const client = ctx.client;

  let database = false;
  try {
    const { error } = await client
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .limit(1);
    database = !error;
  } catch {
    database = false;
  }

  let storage = false;
  let documentsBucket = false;
  try {
    const { data: buckets, error } = await client.storage.listBuckets();
    if (!error && Array.isArray(buckets)) {
      storage = true;
      documentsBucket = buckets.some(
        (bucket) => bucket.name === STORAGE_BUCKET_DOCUMENTS,
      );
    }
  } catch {
    storage = false;
  }

  let auth = false;
  try {
    const {
      data: { user },
    } = await client.auth.getUser();
    auth = Boolean(user);
  } catch {
    auth = false;
  }

  return {
    success: true,
    data: {
      configured: true,
      url: getSupabaseUrl(),
      configSource: "environment",
      environment: process.env.NODE_ENV ?? "development",
      database,
      storage,
      documentsBucket,
      auth,
      checkedAt: new Date().toISOString(),
    } satisfies SupabaseIntegrationStatus,
    message: null,
  };
}