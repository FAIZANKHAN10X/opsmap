"use server";

import type { AssetType } from "@/types/domain";

import { runAction, runListAction, withServerContext } from "@/lib/server/action-context";
import { requireRole } from "@/lib/server/authorize";
import { toAssetType } from "@/lib/server/mappers";
import { parsePagination } from "@/lib/server/pagination";
import { AssetTypeRepository } from "@/lib/server/repositories/asset-types";
import { AssetTypeService } from "@/lib/server/services/asset-types";

export type AssetTypeCreateInput = {
  name: string;
  slug: string;
  description?: string | null;
  sort_order?: number;
};

export type AssetTypeUpdateInput = {
  name?: string;
  slug?: string;
  description?: string | null;
  sort_order?: number;
};

export async function listAssetTypes(params?: { page?: number; limit?: number }) {
  return runListAction<AssetType>(async () => {
    const { client } = await withServerContext();
    const { page, limit } = parsePagination(params?.page, params?.limit);
    const service = new AssetTypeService(new AssetTypeRepository(client));
    const { items, total } = await service.list({ page, limit });
    return { items: items.map(toAssetType), total, page, limit };
  });
}

export async function getAssetType(id: string) {
  return runAction<AssetType>(async () => {
    const { client } = await withServerContext();
    const service = new AssetTypeService(new AssetTypeRepository(client));
    return toAssetType(await service.get(id));
  });
}

export async function createAssetType(payload: AssetTypeCreateInput) {
  return runAction<AssetType>(async () => {
    const ctx = await withServerContext();
    const actor = requireRole(ctx.actor, "manager", "create", "asset type");
    const service = new AssetTypeService(new AssetTypeRepository(ctx.client), { actor });
    return toAssetType(await service.create(payload));
  });
}

export async function updateAssetType(id: string, payload: AssetTypeUpdateInput) {
  return runAction<AssetType>(async () => {
    const ctx = await withServerContext();
    const actor = requireRole(ctx.actor, "manager", "update", "asset type");
    const service = new AssetTypeService(new AssetTypeRepository(ctx.client), { actor });
    return toAssetType(await service.update(id, payload));
  });
}