import "server-only";

import { ForbiddenError } from "@/lib/server/errors";
import type { UserRole } from "@/types/domain";

/**
 * Business-user role authorization (Phase 14). Roles gate mutations at the
 * action boundary (the app's authoritative service layer per DECISIONS.md);
 * RLS mirrors the same rules at the database for defense-in-depth.
 *
 * Hierarchy: viewer < operator < manager < admin. Capabilities are derived
 * from the hierarchy so new write surfaces only declare the minimum role.
 */
export const USER_ROLES: readonly UserRole[] = [
  "viewer",
  "operator",
  "manager",
  "admin",
] as const;

const ROLE_LEVEL: Record<UserRole, number> = {
  viewer: 1,
  operator: 2,
  manager: 3,
  admin: 4,
};

export type Actor = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: UserRole;
};

/** True when the actor holds at least the given role level. */
export function hasRole(actor: Actor | null, minimum: UserRole): boolean {
  if (!actor) return false;
  const level = ROLE_LEVEL[actor.role];
  if (level === undefined) return false;
  return level >= ROLE_LEVEL[minimum];
}

/**
 * Throws ForbiddenError unless the actor holds at least `minimum`. Returns the
 * actor so call sites can thread `actor.id` into created_by/updated_by.
 */
export function requireRole(
  actor: Actor | null,
  minimum: UserRole,
  action: string,
  resource: string,
): Actor {
  if (!hasRole(actor, minimum)) {
    throw new ForbiddenError(
      "FORBIDDEN",
      `Role ${minimum}+ is required to ${action} ${resource}.`,
    );
  }
  return actor as Actor;
}