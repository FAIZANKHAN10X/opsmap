"use server";

import type { Asset } from "@/types/domain";

import { runAction, runListAction, withServerContext } from "@/lib/server/action-context";
import { toAsset } from "@/lib/server/mappers";
import { parsePagination } from "@/lib/server/pagination";
import type { AssetListFilters } from "@/lib/server/repositories/assets";
import { AssetService } from "@/lib/server/services/assets";

export type AssetCreateInput = {
  project_id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  asset_type_id?: string | null;
  asset_status_id?: string | null;
  owner?: string | null;
  notes?: string | null;
  assignees?: string[];
  metadata?: Record<string, unknown>;
};

export type AssetUpdateInput = {
  name?: string;
  code?: string | null;
  description?: string | null;
  asset_type_id?: string | null;
  asset_status_id?: string | null;
  owner?: string | null;
  notes?: string | null;
  assignees?: string[];
  metadata?: Record<string, unknown>;
};

export type AssetListParams = {
  page?: number;
  limit?: number;
  project_id?: string | null;
  asset_type_id?: string | null;
  asset_status_id?: string | null;
  type_slug?: string | null;
  type_slugs?: string[];
  status_slug?: string | null;
  status_slugs?: string[];
  search?: string | null;
  owner?: string | null;
  assigned_to?: string | null;
  created_after?: string | null;
  created_before?: string | null;
  sort?: string;
  order?: string;
};

export async function listAssets(params?: AssetListParams) {
  return runListAction<Asset>(async () => {
    const { client } = await withServerContext();
    const { page, limit } = parsePagination(params?.page, params?.limit);
    const service = new AssetService(client, client);
    const filters: AssetListFilters = {
      page,
      limit,
      project_id: params?.project_id ?? null,
      asset_type_id: params?.asset_type_id ?? null,
      asset_status_id: params?.asset_status_id ?? null,
      type_slug: params?.type_slug ?? null,
      type_slugs: params?.type_slugs ?? undefined,
      status_slug: params?.status_slug ?? null,
      status_slugs: params?.status_slugs ?? undefined,
      search: params?.search ?? null,
      owner: params?.owner ?? null,
      assigned_to: params?.assigned_to ?? null,
      created_after: params?.created_after ?? null,
      created_before: params?.created_before ?? null,
      sort: params?.sort ?? "created_at",
      order: params?.order ?? "desc",
    };
    const { items, total } = await service.list(filters);
    return { items: items.map(toAsset), total, page, limit };
  });
}

export async function getAsset(id: string) {
  return runAction<Asset>(async () => {
    const { client } = await withServerContext();
    const service = new AssetService(client, client);
    return toAsset(await service.get(id));
  });
}

export async function createAsset(payload: AssetCreateInput) {
  return runAction<Asset>(async () => {
    const { client, admin } = await withServerContext();
    const service = new AssetService(client, admin);
    return toAsset(await service.create(payload));
  });
}

export async function updateAsset(id: string, payload: AssetUpdateInput) {
  return runAction<Asset>(async () => {
    const { client, admin } = await withServerContext();
    const service = new AssetService(client, admin);
    return toAsset(await service.update(id, payload));
  });
}

export async function deleteAsset(id: string) {
  return runAction<null>(async () => {
    const { client } = await withServerContext();
    const service = new AssetService(client, client);
    await service.delete(id);
    return null;
  });
}