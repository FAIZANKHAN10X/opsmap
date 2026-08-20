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

/** Idempotently create any missing default property/villa types (Seed Defaults). */
export async function seedDefaultAssetTypes(): Promise<ApiListSuccess<AssetType>> {
  const response = await fetch("/api/asset-types/seed-defaults", {
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
  return (await response.json()) as ApiListSuccess<AssetType>;
}