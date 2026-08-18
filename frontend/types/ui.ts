/** UI-only types for shell and workspace chrome. */

import type { UserRole } from "@/types/domain";

export type NavItemId =
  | "dashboard"
  | "development"
  | "contacts"
  | "database"
  | "settings";

export type NavItem = {
  id: NavItemId;
  label: string;
  href: string;
  icon: "grid" | "pin" | "users" | "database" | "settings";
};

export type AsyncState = "idle" | "loading" | "success" | "error" | "empty";

export type AssetFilterState = {
  search: string;
  statusSlugs: string[];
  typeSlugs: string[];
};

export type WorkspaceViewMode = "map" | "list";

/** Minimal signed-in user info surfaced to the client shell. */
export type SessionUser = {
  email: string | null;
  fullName: string | null;
  role: UserRole | null;
};
