/** UI-only types for shell and workspace chrome. */

export type NavItemId =
  | "dashboard"
  | "projects"
  | "assets"
  | "search"
  | "tasks"
  | "documents"
  | "reports"
  | "settings";

export type NavItem = {
  id: NavItemId;
  label: string;
  href: string;
  icon:
    | "grid"
    | "folder"
    | "box"
    | "check"
    | "file"
    | "chart"
    | "settings"
    | "search";
};

export type AsyncState = "idle" | "loading" | "success" | "error" | "empty";

export type AssetFilterState = {
  search: string;
  statusSlugs: string[];
  typeSlugs: string[];
};

export type WorkspaceViewMode = "map" | "list";
