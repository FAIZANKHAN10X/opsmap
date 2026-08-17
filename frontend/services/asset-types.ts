/**
 * Asset type service — delegates to Server Actions backed by Supabase.
 * Mirrors GET /api/v1/asset-types.
 */

import type { ApiListSuccess, AssetType } from "@/types/domain";

import { listAssetTypes as listAssetTypesAction } from "@/actions/asset-types";
import { unwrapListAction } from "@/services/helpers";

export async function listAssetTypes(): Promise<ApiListSuccess<AssetType>> {
  return unwrapListAction(await listAssetTypesAction({ page: 1, limit: 100 }));
}