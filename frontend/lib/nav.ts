import type { NavItem } from "@/types/ui";

/**
 * Sidebar navigation.
 * Each item must have a unique href so only one entry is active at a time.
 * Unimplemented sections use placeholder routes (coming-soon pages).
 */
export const MAIN_NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: "grid" },
  {
    id: "projects",
    label: "Projects",
    href: "/dashboard/projects",
    icon: "folder",
  },
  { id: "assets", label: "Assets", href: "/dashboard/assets", icon: "box" },
  { id: "tasks", label: "Tasks", href: "/dashboard/tasks", icon: "check" },
  {
    id: "documents",
    label: "Documents",
    href: "/dashboard/documents",
    icon: "file",
  },
  {
    id: "reports",
    label: "Reports",
    href: "/dashboard/reports",
    icon: "chart",
  },
  {
    id: "settings",
    label: "Settings",
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
