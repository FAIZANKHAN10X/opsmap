import { DashboardWorkspace } from "@/features/dashboard/DashboardWorkspace";

/**
 * ULLUWATU "26 — property workspace for the selected project (Phase 11).
 * Reuses the 8AM HUB workspace (map + list + KPIs), scoped to the active
 * project. The label is rendered dynamically in the sidebar from the project.
 */
export default function DevelopmentPage() {
  return <DashboardWorkspace />;
}