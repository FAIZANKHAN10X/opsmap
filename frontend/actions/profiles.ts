"use server";

import { runAction, withServerContext } from "@/lib/server/action-context";
import { audit } from "@/lib/server/audit";
import { requireRole, USER_ROLES } from "@/lib/server/authorize";
import { NotFoundError } from "@/lib/server/errors";
import type { UserRole } from "@/types/domain";

export type SetUserRoleInput = {
  target_user_id: string;
  role: UserRole;
};

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

    audit("role.changed", {
      target_user_id: payload.target_user_id,
      role: payload.role,
      changed_by: actor.id,
    });
    return null;
  });
}