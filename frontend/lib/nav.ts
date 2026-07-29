import type { NavItem } from "@/types/ui";

export const MAIN_NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: "grid" },
  { id: "projects", label: "Projects", href: "/dashboard", icon: "folder" },
  { id: "assets", label: "Assets", href: "/dashboard", icon: "box" },
  { id: "tasks", label: "Tasks", href: "/dashboard", icon: "check" },
  { id: "documents", label: "Documents", href: "/dashboard", icon: "file" },
  { id: "reports", label: "Reports", href: "/dashboard", icon: "chart" },
  { id: "settings", label: "Settings", href: "/dashboard", icon: "settings" },
];
