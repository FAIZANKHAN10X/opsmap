"use server";

import { revalidatePath } from "next/cache";

import type { Asset } from "@/types/domain";

import { runAction, runListAction, withServerContext } from "@/lib/server/action-context";
import { requireRole } from "@/lib/server/authorize";
import { toAsset } from "@/lib/server/mappers";
import { parsePagination } from "@/lib/server/pagination";
import type { AssetListFilters } from "@/lib/server/repositories/assets";
import { AssetService } from "@/lib/server/services/assets";
import { getDemoAsset, listDemoAssets } from "@/lib/demo/provider";

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
  /** Geographic placement (WGS84); both-or-none. */
  latitude?: number | null;
  longitude?: number | null;
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
  /** Geographic placement (WGS84); both-or-none. Null clears placement. */
  latitude?: number | null;
  longitude?: number | null;
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
  /** Geographic placement filter for the real map. */
  placement?: "placed" | "unplaced" | null;
  sort?: string;
  order?: string;
  // Phase A professional filters (metadata)
  price_min?: number | null;
  price_max?: number | null;
  currency?: string | null;
  bedrooms_min?: number | null;
  bathrooms_min?: number | null;
  area_min?: number | null;
  area_max?: number | null;
  furnishing?: string | null;
  features?: string[];
};

const ASSET_ROUTES = [
  "/dashboard",
  "/dashboard/development",
  "/dashboard/database",
  "/dashboard/assets",
  "/dashboard/search",
  "/dashboard/properties/[id]",
] as const;

function revalidateAssetRoutes() {
  for (const path of ASSET_ROUTES) revalidatePath(path);
}

export async function listAssets(params?: AssetListParams, demo?: boolean) {
  return runListAction<Asset>(async () => {
    const { client } = await withServerContext();
    const { page, limit } = parsePagination(params?.page, params?.limit);

    if (demo) {
      const { items, total } = await listDemoAssets(client, {
        page,
        limit,
        search: params?.search ?? null,
        status_slugs: params?.status_slugs ?? (params?.status_slug ? [params.status_slug] : undefined),
        type_slugs: params?.type_slugs ?? (params?.type_slug ? [params.type_slug] : undefined),
        placement: params?.placement ?? null,
        sort: params?.sort ?? "created_at",
        order: params?.order ?? "desc",
        price_min: params?.price_min ?? null,
        price_max: params?.price_max ?? null,
        currency: params?.currency ?? null,
        bedrooms_min: params?.bedrooms_min ?? null,
        bathrooms_min: params?.bathrooms_min ?? null,
        area_min: params?.area_min ?? null,
        area_max: params?.area_max ?? null,
        furnishing: params?.furnishing ?? null,
        features: params?.features ?? undefined,
      });
      return { items: items.map(toAsset), total, page, limit };
    }

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
      placement: params?.placement ?? null,
      sort: params?.sort ?? "created_at",
      order: params?.order ?? "desc",
      price_min: params?.price_min ?? null,
      price_max: params?.price_max ?? null,
      currency: params?.currency ?? null,
      bedrooms_min: params?.bedrooms_min ?? null,
      bathrooms_min: params?.bathrooms_min ?? null,
      area_min: params?.area_min ?? null,
      area_max: params?.area_max ?? null,
      furnishing: params?.furnishing ?? null,
      features: params?.features ?? undefined,
    };
    const { items, total } = await service.list(filters);
    return { items: items.map(toAsset), total, page, limit };
  });
}

export async function getAsset(id: string, demo?: boolean) {
  return runAction<Asset>(async () => {
    const { client } = await withServerContext();
    if (demo) return toAsset(await getDemoAsset(client, id));
    const service = new AssetService(client, client);
    return toAsset(await service.get(id));
  });
}

export async function createAsset(payload: AssetCreateInput) {
  return runAction<Asset>(async () => {
    const ctx = await withServerContext();
    const actor = requireRole(ctx.actor, "operator", "create", "asset");
    const service = new AssetService(ctx.client, ctx.admin, { actor });
    const asset = await service.create(payload);
    revalidateAssetRoutes();
    return toAsset(asset);
  });
}

export async function updateAsset(id: string, payload: AssetUpdateInput) {
  return runAction<Asset>(async () => {
    const ctx = await withServerContext();
    const actor = requireRole(ctx.actor, "operator", "update", "asset");
    const service = new AssetService(ctx.client, ctx.admin, { actor });
    const asset = await service.update(id, payload);
    revalidateAssetRoutes();
    return toAsset(asset);
  });
}

export async function deleteAsset(id: string) {
  return runAction<null>(async () => {
    const ctx = await withServerContext();
    const actor = requireRole(ctx.actor, "manager", "delete", "asset");
    const service = new AssetService(ctx.client, ctx.client, { actor });
    await service.delete(id);
    revalidateAssetRoutes();
    return null;
  });
}