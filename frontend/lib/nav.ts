import type { NavItem } from "@/types/ui";

/**
 * 8AM HUB sidebar navigation (Phase 11).
 * Each item must have a unique href so only one entry is active at a time.
 *
 * The ULLUWATU "26 label is a fallback; the Sidebar renders the live label
 * from the currently selected project (see Sidebar.tsx).
 */
export const MAIN_NAV: NavItem[] = [
  { id: "dashboard", label: "DASHBOARD", href: "/dashboard", icon: "grid" },
  {
    id: "development",
    label: 'ULLUWATU "26',
    href: "/dashboard/development",
    icon: "pin",
  },
  {
    id: "projects",
    label: "PROJECTS",
    href: "/dashboard/projects",
    icon: "folder",
  },
  { id: "contacts", label: "CONTACTS", href: "/dashboard/contacts", icon: "users" },
  {
    id: "database",
    label: "DATABASE",
    href: "/dashboard/database",
    icon: "database",
  },
  {
    id: "settings",
    label: "SETTINGS",
    href: "/dashboard/settings",
    icon: "settings",
  },
];

/** True when this nav item should show the active (blue) style. */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  // Nested paths (e.g. /dashboard/assets/xyz) — never treat bare /dashboard as a prefix match
  // for every item, or every sibling would light up.
  if (href !== "/dashboard" && pathname.startsWith(`${href}/`)) return true;
  return false;
}