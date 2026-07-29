/**
 * Asset type service (mock).
 * Future: GET /api/v1/asset-types
 */

import type { ApiListSuccess, AssetType } from "@/types/domain";

import { MOCK_ASSET_TYPES, mockForceError } from "@/services/mock/data";
import { delay } from "@/services/mock/delay";

const USE_MOCK = true;

export async function listAssetTypes(): Promise<ApiListSuccess<AssetType>> {
  if (USE_MOCK) {
    await delay(150);
    if (mockForceError) {
      throw new Error("Failed to load asset types.");
    }
    return {
      success: true,
      data: MOCK_ASSET_TYPES,
      pagination: {
        page: 1,
        limit: 25,
        total: MOCK_ASSET_TYPES.length,
        pages: 1,
      },
      message: null,
    };
  }

  throw new Error("Live API not enabled");
}
