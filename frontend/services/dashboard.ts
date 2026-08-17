/**
 * Dashboard aggregation service — delegates to Server Actions backed by
 * Supabase. Status listing lives in the asset-statuses service (Status Engine).
 */

import type { ApiSuccess, ProjectSummary } from "@/types/domain";

import { getProjectSummary as getProjectSummaryAction } from "@/actions/dashboard";
import { unwrapAction } from "@/services/helpers";

// Re-export for existing dashboard imports.
export { listAssetStatuses } from "@/services/asset-statuses";

export async function getProjectSummary(
  projectId: string,
  demo = false,
): Promise<ApiSuccess<ProjectSummary>> {
  return unwrapAction(await getProjectSummaryAction(projectId, demo));
}