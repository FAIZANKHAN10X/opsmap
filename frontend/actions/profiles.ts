"use server";

import { revalidatePath } from "next/cache";

import {
  runAction,
  runListAction,
  withServerContext,
} from "@/lib/server/action-context";
import { audit } from "@/lib/server/audit";
import { requireRole, USER_ROLES } from "@/lib/server/authorize";
import { NotFoundError } from "@/lib/server/errors";
import { toProfileSummary } from "@/lib/server/mappers";
import { parsePagination } from "@/lib/server/pagination";
import type { ProfileSummary, UserRole } from "@/types/domain";

export type SetUserRoleInput = {
  target_user_id: string;
  role: UserRole;
};

const USER_ROUTES = ["/dashboard/settings"] as const;

function revalidateUserRoutes() {
  for (const path of USER_ROUTES) revalidatePath(path);
}

/**
 * Admin-only user list for the SETTINGS users/roles surface. Reads through the
 * authenticated client so RLS governs visibility (admins may select all
 * profiles via `profiles_admin_select_all`; non-admins are rejected here by
 * requireRole before any query runs).
 */
export async function listUsers(params?: {
  page?: number;
  limit?: number;
}) {
  return runListAction<ProfileSummary>(async () => {
    const ctx = await withServerContext();
    requireRole(ctx.actor, "admin", "view", "users");

    const { page, limit } = parsePagination(params?.page, params?.limit, 100);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await ctx.client
      .from("profiles")
      .select("id, email, full_name, role, created_at, updated_at", {
        count: "exact",
      })
      .order("created_at", { ascending: true })
      .range(from, to);
    if (error) throw error;

    return {
      items: (data ?? []).map(toProfileSummary),
      total: count ?? 0,
      page,
      limit,
    };
  });
}

/**
 * Admin-only role assignment. Enforced in the action layer (requireRole) and
 * again in the database by the SECURITY DEFINER `public.set_user_role()`
 * (see supabase/migrations/20260818000001_phase14_roles.sql), which is the
 * only path that can change a profile's role (self-escalation guard).
 */
export async function setUserRole(payload: SetUserRoleInput) {
  return runAction<null>(async () => {
    const ctx = await withServerContext();
    const actor = requireRole(ctx.actor, "admin", "change", "user roles");

    if (!USER_ROLES.includes(payload.role)) {
      throw new NotFoundError("INVALID_ROLE", `Unknown role: ${payload.role}.`);
    }

    const { error } = await ctx.admin.rpc("set_user_role", {
      target_user_id: payload.target_user_id,
      new_role: payload.role,
    });
    if (error) {
      if (error.message.includes("PROFILE_NOT_FOUND")) {
        throw new NotFoundError("PROFILE_NOT_FOUND", "User profile not found.");
      }
      if (error.message.includes("FORBIDDEN")) {
        throw new NotFoundError("FORBIDDEN", "Only admins can change roles.");
      }
      throw error;
    }

    revalidateUserRoutes();
    audit("role.changed", {
      target_user_id: payload.target_user_id,
      role: payload.role,
      changed_by: actor.id,
    });
    return null;
  });
}