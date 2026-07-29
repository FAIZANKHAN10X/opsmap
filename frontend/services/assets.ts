/**
 * Asset service — mock-backed CRUD matching backend /api/v1/assets.
 */

import type {
  ApiListSuccess,
  ApiSuccess,
  Asset,
  AssetCreateInput,
  AssetUpdateInput,
} from "@/types/domain";

import {
  MOCK_ASSETS,
  MOCK_ASSET_STATUSES,
  isoNow,
  mockForceError,
  newId,
  setMockAssets,
} from "@/services/mock/data";
import { delay } from "@/services/mock/delay";

const USE_MOCK = true;

export type ListAssetsParams = {
  project_id?: string;
  page?: number;
  limit?: number;
  search?: string;
  status_slugs?: string[];
  asset_type_id?: string;
  asset_status_id?: string;
};

function paginate<T>(
  data: T[],
  page: number,
  limit: number,
): ApiListSuccess<T> {
  const total = data.length;
  const start = (page - 1) * limit;
  return {
    success: true,
    data: data.slice(start, start + limit),
    pagination: {
      page,
      limit,
      total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    message: null,
  };
}

export async function listAssets(
  params: ListAssetsParams = {},
): Promise<ApiListSuccess<Asset>> {
  if (USE_MOCK) {
    await delay(300);
    if (mockForceError) throw new Error("Failed to load assets.");

    let data = [...MOCK_ASSETS];
    if (params.project_id) {
      data = data.filter((a) => a.project_id === params.project_id);
    }
    if (params.asset_type_id) {
      data = data.filter((a) => a.asset_type_id === params.asset_type_id);
    }
    if (params.asset_status_id) {
      data = data.filter((a) => a.asset_status_id === params.asset_status_id);
    }
    if (params.search?.trim()) {
      const q = params.search.trim().toLowerCase();
      data = data.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.code?.toLowerCase().includes(q) ?? false) ||
          (a.owner?.toLowerCase().includes(q) ?? false),
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

    return paginate(data, params.page ?? 1, params.limit ?? 100);
  }

  throw new Error("Live API not enabled");
}

export async function getAsset(id: string): Promise<ApiSuccess<Asset>> {
  if (USE_MOCK) {
    await delay(150);
    const asset = MOCK_ASSETS.find((a) => a.id === id);
    if (!asset) throw new Error("Asset not found.");
    return { success: true, data: asset, message: null };
  }
  throw new Error("Live API not enabled");
}

export async function createAsset(
  input: AssetCreateInput,
): Promise<ApiSuccess<Asset>> {
  if (USE_MOCK) {
    await delay(250);
    const stamp = isoNow();
    const asset: Asset = {
      id: newId("asset"),
      project_id: input.project_id,
      name: input.name.trim(),
      code: input.code?.trim() || null,
      description: input.description ?? null,
      asset_type_id: input.asset_type_id ?? null,
      asset_status_id: input.asset_status_id ?? null,
      owner: input.owner?.trim() || null,
      notes: input.notes ?? null,
      assignees: [...(input.assignees ?? [])],
      metadata: { ...(input.metadata ?? {}) },
      created_at: stamp,
      updated_at: stamp,
    };
    setMockAssets([asset, ...MOCK_ASSETS]);
    return { success: true, data: asset, message: null };
  }
  throw new Error("Live API not enabled");
}

export async function updateAsset(
  id: string,
  input: AssetUpdateInput,
): Promise<ApiSuccess<Asset>> {
  if (USE_MOCK) {
    await delay(250);
    const index = MOCK_ASSETS.findIndex((a) => a.id === id);
    if (index < 0) throw new Error("Asset not found.");
    const current = MOCK_ASSETS[index];
    const updated: Asset = {
      ...current,
      name: input.name !== undefined ? input.name.trim() : current.name,
      code:
        input.code !== undefined
          ? input.code?.trim() || null
          : current.code,
      description:
        input.description !== undefined ? input.description : current.description,
      asset_type_id:
        input.asset_type_id !== undefined
          ? input.asset_type_id
          : current.asset_type_id,
      asset_status_id:
        input.asset_status_id !== undefined
          ? input.asset_status_id
          : current.asset_status_id,
      owner:
        input.owner !== undefined
          ? input.owner?.trim() || null
          : current.owner,
      notes: input.notes !== undefined ? input.notes : current.notes,
      assignees:
        input.assignees !== undefined
          ? [...input.assignees]
          : current.assignees,
      metadata:
        input.metadata !== undefined
          ? { ...input.metadata }
          : current.metadata,
      updated_at: isoNow(),
    };
    const next = [...MOCK_ASSETS];
    next[index] = updated;
    setMockAssets(next);
    return { success: true, data: updated, message: null };
  }
  throw new Error("Live API not enabled");
}

export async function deleteAsset(id: string): Promise<void> {
  if (USE_MOCK) {
    await delay(200);
    const exists = MOCK_ASSETS.some((a) => a.id === id);
    if (!exists) throw new Error("Asset not found.");
    setMockAssets(MOCK_ASSETS.filter((a) => a.id !== id));
    return;
  }
  throw new Error("Live API not enabled");
}
