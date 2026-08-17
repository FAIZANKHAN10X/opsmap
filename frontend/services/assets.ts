/**
 * Asset service — delegates to Server Actions backed by Supabase.
 * Mirrors backend /api/v1/assets.
 */

import type {
  ApiListSuccess,
  ApiSuccess,
  Asset,
  AssetCreateInput,
  AssetUpdateInput,
} from "@/types/domain";

import {
  createAsset as createAssetAction,
  deleteAsset as deleteAssetAction,
  getAsset as getAssetAction,
  listAssets as listAssetsAction,
  updateAsset as updateAssetAction,
} from "@/actions/assets";
import { unwrapAction, unwrapListAction } from "@/services/helpers";

export type ListAssetsParams = {
  project_id?: string;
  page?: number;
  limit?: number;
  search?: string;
  status_slugs?: string[];
  type_slugs?: string[];
  asset_type_id?: string;
  asset_status_id?: string;
};

export async function listAssets(
  params: ListAssetsParams = {},
): Promise<ApiListSuccess<Asset>> {
  return unwrapListAction(
    await listAssetsAction({
      page: params.page,
      limit: params.limit,
      project_id: params.project_id ?? null,
      asset_type_id: params.asset_type_id ?? null,
      asset_status_id: params.asset_status_id ?? null,
      status_slugs: params.status_slugs,
      type_slugs: params.type_slugs,
      search: params.search ?? null,
    }),
  );
}

export async function getAsset(id: string): Promise<ApiSuccess<Asset>> {
  return unwrapAction(await getAssetAction(id));
}

export async function createAsset(
  input: AssetCreateInput,
): Promise<ApiSuccess<Asset>> {
  return unwrapAction(await createAssetAction(input));
}

export async function updateAsset(
  id: string,
  input: AssetUpdateInput,
): Promise<ApiSuccess<Asset>> {
  return unwrapAction(await updateAssetAction(id, input));
}

export async function deleteAsset(id: string): Promise<void> {
  unwrapAction(await deleteAssetAction(id));
}