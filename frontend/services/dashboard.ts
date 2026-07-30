/**
 * Dashboard aggregation service (mock).
 * Status listing lives in asset-statuses service (Status Engine).
 */

import type { ApiSuccess, ProjectSummary } from "@/types/domain";

import { buildProjectSummary, mockForceError } from "@/services/mock/data";
import { delay } from "@/services/mock/delay";

// Re-export for existing dashboard imports.
export { listAssetStatuses } from "@/services/asset-statuses";

const USE_MOCK = true;

export async function getProjectSummary(
  projectId: string,
): Promise<ApiSuccess<ProjectSummary>> {
  if (USE_MOCK) {
    await delay(500);
    if (mockForceError) {
      throw new Error("Failed to load project summary.");
    }
    return {
      success: true,
      data: buildProjectSummary(projectId),
      message: null,
    };
  }

  throw new Error("Live API not enabled");
}
