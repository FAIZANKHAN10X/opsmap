import "server-only";

import type { Client } from "@/lib/server/repositories/base";
import type { ApiResponse } from "@/types/api";
import type { ApiListSuccess, PaginationMeta } from "@/types/domain";

import { isSupabaseConfigured } from "@/lib/env";
import { toActionError } from "@/lib/server/errors";
import { paginationMeta } from "@/lib/server/pagination";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ServerContext = {
  client: Client;
  admin: Client;
};

/**
 * Builds the authenticated server client (RLS-scoped, per request) plus the
 * service-role admin client for privileged writes (e.g. notification creation).
 * Throws when Supabase isn't configured or the caller isn't authenticated.
 */
export async function withServerContext(): Promise<ServerContext> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  const client = await createClient();
  const admin = createAdminClient();
  return { client, admin };
}

/** Wraps a Server Action, converting thrown errors to the API envelope. */
export async function runAction<T>(
  fn: () => Promise<T>,
): Promise<ApiResponse<T>> {
  try {
    const data = await fn();
    return { success: true, data, message: null };
  } catch (e) {
    return toActionError(e);
  }
}

/**
 * Wraps a Server Action that returns a paginated list, composing the
 * pagination meta (mirrors ApiListSuccess from the Python list endpoints).
 */
export async function runListAction<T>(
  fn: () => Promise<{ items: T[]; total: number; page: number; limit: number }>,
): Promise<ApiListSuccess<T>> {
  try {
    const { items, total, page, limit } = await fn();
    const pagination: PaginationMeta = paginationMeta(page, limit, total);
    return { success: true, data: items, pagination, message: null };
  } catch (e) {
    return toActionError(e) as unknown as ApiListSuccess<T>;
  }
}