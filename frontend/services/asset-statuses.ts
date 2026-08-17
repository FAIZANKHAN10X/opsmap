/**
 * Asset status service — Status Engine, delegates to Server Actions backed by
 * Supabase. Mirrors /api/v1/asset-statuses.
 */

import type {
  ApiListSuccess,
  ApiSuccess,
  AssetStatus,
} from "@/types/domain";

import {
  createAssetStatus as createAssetStatusAction,
  deleteAssetStatus as deleteAssetStatusAction,
  listAssetStatuses as listAssetStatusesAction,
  updateAssetStatus as updateAssetStatusAction,
} from "@/actions/asset-statuses";
import { unwrapAction, unwrapListAction } from "@/services/helpers";

export type AssetStatusCreateInput = {
  name: string;
  slug: string;
  description?: string | null;
  color: string;
  sort_order?: number;
};

export type AssetStatusUpdateInput = {
  name?: string;
  slug?: string;
  description?: string | null;
  color?: string;
  sort_order?: number;
};

export async function listAssetStatuses(): Promise<ApiListSuccess<AssetStatus>> {
  return unwrapListAction(await listAssetStatusesAction({ page: 1, limit: 100 }));
}

export async function createAssetStatus(
  input: AssetStatusCreateInput,
): Promise<ApiSuccess<AssetStatus>> {
  return unwrapAction(await createAssetStatusAction(input));
}

export async function updateAssetStatus(
  id: string,
  input: AssetStatusUpdateInput,
): Promise<ApiSuccess<AssetStatus>> {
  return unwrapAction(await updateAssetStatusAction(id, input));
}

export async function deleteAssetStatus(id: string): Promise<void> {
  unwrapAction(await deleteAssetStatusAction(id));
}

export async function seedDefaultStatuses(): Promise<ApiListSuccess<AssetStatus>> {
  const response = await fetch("/api/asset-statuses/seed-defaults", {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    let message = `Seed failed (${response.status}).`;
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body.error?.message) message = body.error.message;
    } catch {
      // keep the generic message
    }
    throw new Error(message);
  }
  return (await response.json()) as ApiListSuccess<AssetStatus>;
}