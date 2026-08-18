"use server";

import type { AssetStatus } from "@/types/domain";

import { runAction, runListAction, withServerContext } from "@/lib/server/action-context";
import { requireRole } from "@/lib/server/authorize";
import { toAssetStatus } from "@/lib/server/mappers";
import { parsePagination } from "@/lib/server/pagination";
import { AssetStatusRepository } from "@/lib/server/repositories/asset-statuses";
import { AssetStatusService } from "@/lib/server/services/asset-statuses";

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

export async function listAssetStatuses(params?: { page?: number; limit?: number }) {
  return runListAction<AssetStatus>(async () => {
    const { client } = await withServerContext();
    const { page, limit } = parsePagination(params?.page, params?.limit);
    const service = new AssetStatusService(new AssetStatusRepository(client));
    const { items, total } = await service.list({ page, limit });
    return { items: items.map(toAssetStatus), total, page, limit };
  });
}

export async function getAssetStatus(id: string) {
  return runAction<AssetStatus>(async () => {
    const { client } = await withServerContext();
    const service = new AssetStatusService(new AssetStatusRepository(client));
    return toAssetStatus(await service.get(id));
  });
}

export async function createAssetStatus(payload: AssetStatusCreateInput) {
  return runAction<AssetStatus>(async () => {
    const ctx = await withServerContext();
    const actor = requireRole(ctx.actor, "manager", "create", "asset status");
    const service = new AssetStatusService(new AssetStatusRepository(ctx.client), { actor });
    return toAssetStatus(await service.create(payload));
  });
}

export async function updateAssetStatus(id: string, payload: AssetStatusUpdateInput) {
  return runAction<AssetStatus>(async () => {
    const ctx = await withServerContext();
    const actor = requireRole(ctx.actor, "manager", "update", "asset status");
    const service = new AssetStatusService(new AssetStatusRepository(ctx.client), { actor });
    return toAssetStatus(await service.update(id, payload));
  });
}

export async function deleteAssetStatus(id: string) {
  return runAction<null>(async () => {
    const ctx = await withServerContext();
    const actor = requireRole(ctx.actor, "manager", "delete", "asset status");
    const service = new AssetStatusService(new AssetStatusRepository(ctx.client), { actor });
    await service.delete(id);
    return null;
  });
}