/**
 * Dashboard aggregation service (mock).
 * Future: GET /api/v1/projects/{id}/summary (or compose from assets + statuses).
 */

import type {
  ApiListSuccess,
  ApiSuccess,
  AssetStatus,
  ProjectSummary,
} from "@/types/domain";

import {
  MOCK_ASSET_STATUSES,
  buildProjectSummary,
  mockForceError,
} from "@/services/mock/data";
import { delay } from "@/services/mock/delay";

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

export async function listAssetStatuses(): Promise<ApiListSuccess<AssetStatus>> {
  if (USE_MOCK) {
    await delay(200);
    return {
      success: true,
      data: MOCK_ASSET_STATUSES,
      pagination: {
        page: 1,
        limit: 25,
        total: MOCK_ASSET_STATUSES.length,
        pages: 1,
      },
      message: null,
    };
  }

  throw new Error("Live API not enabled");
}
