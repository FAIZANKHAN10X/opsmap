import "server-only";

import type { Client } from "@/lib/server/repositories/base";
import type { ApiResponse } from "@/types/api";
import type { ApiListSuccess, PaginationMeta } from "@/types/domain";

import { isSupabaseConfigured } from "@/lib/env";
import { toActionError } from "@/lib/server/errors";
import { paginationMeta } from "@/lib/server/pagination";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ForbiddenError } from "@/lib/server/errors";
import type { Actor } from "@/lib/server/authorize";
import type { UserRole } from "@/types/domain";

export type ServerContext = {
  client: Client;
  admin: Client;
  /**
   * The signed-in user (id/email/role) resolved from the session + profiles
   * row. Null when unauthenticated or the profile could not be read — never
   * null for real dashboard requests (middleware + layout guard), so role
   * gates fail closed with requireRole.
   */
  actor: Actor | null;
};

/** Resolve the acting user from the session and their profiles row. */
async function resolveActor(client: Client): Promise<Actor | null> {
  try {
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return null;

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("profile_role_lookup_failed", profileError);
    }

    const role = (profile?.role as UserRole | undefined) ?? "viewer";
    return {
      id: user.id,
      email: user.email ?? null,
      fullName:
        (profile?.full_name as string | null | undefined) ??
        (user.user_metadata?.full_name as string | undefined) ??
        null,
      role,
    };
  } catch {
    // Supabase not configured / session unreadable / fake test client without
    // auth support — no actor. Role gates treat this as unauthenticated.
    return null;
  }
}

/**
 * Builds the authenticated server client (RLS-scoped, per request) plus the
 * service-role admin client for privileged writes (e.g. notification creation).
 * Resolves the acting user's role for authorization. Throws when Supabase
 * isn't configured.
 */
export async function withServerContext(): Promise<ServerContext> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  const client = await createClient();
  const admin = createAdminClient();
  const actor = await resolveActor(client);
  return { client, admin, actor };
}

/**
 * Guard for actions that require a signed-in actor (e.g. role management).
 * Throws 403 when no user could be resolved.
 */
export async function requireActor(ctx: ServerContext, action: string): Promise<Actor> {
  if (!ctx.actor) {
    throw new ForbiddenError("FORBIDDEN", `You must be signed in to ${action}.`);
  }
  return ctx.actor;
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