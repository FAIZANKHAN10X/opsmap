/**
 * Asset service (mock).
 * Future: GET /api/v1/assets?project_id=&status=&search=
 */

import type { ApiListSuccess, Asset } from "@/types/domain";

import {
  MOCK_ASSETS,
  MOCK_ASSET_STATUSES,
  mockForceError,
} from "@/services/mock/data";
import { delay } from "@/services/mock/delay";

const USE_MOCK = true;

export type ListAssetsParams = {
  project_id?: string;
  page?: number;
  limit?: number;
  search?: string;
  status_slugs?: string[];
};

export async function listAssets(
  params: ListAssetsParams = {},
): Promise<ApiListSuccess<Asset>> {
  if (USE_MOCK) {
    await delay();
    if (mockForceError) {
      throw new Error("Failed to load assets.");
    }

    let data = [...MOCK_ASSETS];
    if (params.project_id) {
      data = data.filter((a) => a.project_id === params.project_id);
    }
    if (params.search?.trim()) {
      const q = params.search.trim().toLowerCase();
      data = data.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.code?.toLowerCase().includes(q) ?? false),
      );
    }
    if (params.status_slugs && params.status_slugs.length > 0) {
      const allowed = new Set(
        MOCK_ASSET_STATUSES.filter((s) =>
          params.status_slugs!.includes(s.slug),
        ).map((s) => s.id),
      );
      data = data.filter(
        (a) => a.asset_status_id != null && allowed.has(a.asset_status_id),
      );
    }

    const page = params.page ?? 1;
    const limit = params.limit ?? 100;
    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: data.length,
        pages: Math.ceil(data.length / limit) || 0,
      },
      message: null,
    };
  }

  throw new Error("Live API not enabled");
}
