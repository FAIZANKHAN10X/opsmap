"use client";

/**
 * Signed-in user + derived permissions for the client shell.
 *
 * The server remains authoritative — every mutation is re-checked by
 * requireRole in the action layer (and RLS in the database). This context
 * only gates the UI (hiding/disabled write controls) so viewers and operators
 * don't see actions they can't perform.
 */

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import type { UserRole } from "@/types/domain";
import type { SessionUser } from "@/types/ui";

const ROLE_LEVEL: Record<UserRole, number> = {
  viewer: 1,
  operator: 2,
  manager: 3,
  admin: 4,
};

export type Permissions = {
  role: UserRole | null;
  /** create/update assets + documents (operator+) */
  canEdit: boolean;
  /** delete assets/documents, manage projects/statuses/types (manager+) */
  canDelete: boolean;
  canManage: boolean;
  isAdmin: boolean;
};

type UserContextValue = {
  user: SessionUser | null;
  permissions: Permissions;
};

const UserContext = createContext<UserContextValue | null>(null);

function level(role: UserRole | null): number {
  return role ? (ROLE_LEVEL[role] ?? 0) : 0;
}

export function UserProvider({
  user,
  children,
}: {
  user: SessionUser | null;
  children: ReactNode;
}) {
  const value = useMemo<UserContextValue>(() => {
    const lvl = level(user?.role ?? null);
    return {
      user,
      permissions: {
        role: user?.role ?? null,
        canEdit: lvl >= ROLE_LEVEL.operator,
        canDelete: lvl >= ROLE_LEVEL.manager,
        canManage: lvl >= ROLE_LEVEL.manager,
        isAdmin: lvl >= ROLE_LEVEL.admin,
      },
    };
  }, [user]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function usePermissions(): Permissions {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("usePermissions must be used within UserProvider");
  }
  return ctx.permissions;
}

export function useUser(): SessionUser | null {
  const ctx = useContext(UserContext);
  return ctx?.user ?? null;
}