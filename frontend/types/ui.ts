/** UI-only types for shell and workspace chrome. */

import type { UserRole } from "@/types/domain";

export type NavItemId =
  | "dashboard"
  | "development"
  | "projects"
  | "contacts"
  | "database"
  | "settings";

export type NavItem = {
  id: NavItemId;
  label: string;
  href: string;
  icon: "grid" | "pin" | "folder" | "users" | "database" | "settings";
};

export type AsyncState = "idle" | "loading" | "success" | "error" | "empty";

export type AssetFilterState = {
  search: string;
  statusSlugs: string[];
  typeSlugs: string[];
  /** Geographic placement filter for the real map. */
  placement?: "placed" | "unplaced" | null;
};

export type WorkspacePlacementFilter = NonNullable<
  AssetFilterState["placement"]
>;

export type WorkspaceViewMode = "map" | "list";

/** Minimal signed-in user info surfaced to the client shell. */
export type SessionUser = {
  email: string | null;
  fullName: string | null;
  /**
   * Optional profile image (provider avatar / picture). Falls back to
   * initials when absent. Optional so existing call sites (tests, demo
   * harnesses) that only supply name/email remain valid.
   */
  avatarUrl?: string | null;
  role: UserRole | null;
};
