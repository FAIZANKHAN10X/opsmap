/**
 * Asset status service — Status Engine (mock-backed).
 * Future: GET/POST/PATCH/DELETE /api/v1/asset-statuses
 */

import type {
  ApiListSuccess,
  ApiSuccess,
  AssetStatus,
} from "@/types/domain";

import {
  MOCK_ASSET_STATUSES,
  isoNow,
  mockForceError,
  newId,
  setMockAssetStatuses,
} from "@/services/mock/data";
import { delay } from "@/services/mock/delay";

const USE_MOCK = true;

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

const DEFAULT_SEED: AssetStatusCreateInput[] = [
  {
    name: "Available",
    slug: "available",
    color: "#22c55e",
    sort_order: 1,
    description: "Ready for use or sale",
  },
  {
    name: "Reserved",
    slug: "reserved",
    color: "#38bdf8",
    sort_order: 2,
    description: "Held for a pending transaction",
  },
  {
    name: "Occupied",
    slug: "occupied",
    color: "#f59e0b",
    sort_order: 3,
    description: "Currently in use",
  },
  {
    name: "Sold",
    slug: "sold",
    color: "#c026d3",
    sort_order: 4,
    description: "Transaction completed",
  },
  {
    name: "Maintenance",
    slug: "maintenance",
    color: "#ef4444",
    sort_order: 5,
    description: "Temporarily offline for work",
  },
  {
    name: "Pending",
    slug: "pending",
    color: "#a78bfa",
    sort_order: 6,
    description: "Awaiting decision or action",
  },
  {
    name: "Offline",
    slug: "offline",
    color: "#64748b",
    sort_order: 7,
    description: "Not available operationally",
  },
];

function sortedStatuses(): AssetStatus[] {
  return [...MOCK_ASSET_STATUSES].sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
  );
}

export async function listAssetStatuses(): Promise<ApiListSuccess<AssetStatus>> {
  if (USE_MOCK) {
    await delay(150);
    if (mockForceError) throw new Error("Failed to load statuses.");
    const data = sortedStatuses();
    return {
      success: true,
      data,
      pagination: {
        page: 1,
        limit: 50,
        total: data.length,
        pages: data.length === 0 ? 0 : 1,
      },
      message: null,
    };
  }
  throw new Error("Live API not enabled");
}

export async function createAssetStatus(
  input: AssetStatusCreateInput,
): Promise<ApiSuccess<AssetStatus>> {
  if (USE_MOCK) {
    await delay(200);
    const slug = input.slug.trim().toLowerCase();
    if (MOCK_ASSET_STATUSES.some((s) => s.slug === slug)) {
      throw new Error("An asset status with this slug already exists.");
    }
    const stamp = isoNow();
    const status: AssetStatus = {
      id: newId("status"),
      name: input.name.trim(),
      slug,
      description: input.description ?? null,
      color: input.color.trim().toLowerCase(),
      sort_order: input.sort_order ?? 0,
      created_at: stamp,
      updated_at: stamp,
    };
    setMockAssetStatuses([...MOCK_ASSET_STATUSES, status]);
    return { success: true, data: status, message: null };
  }
  throw new Error("Live API not enabled");
}

export async function updateAssetStatus(
  id: string,
  input: AssetStatusUpdateInput,
): Promise<ApiSuccess<AssetStatus>> {
  if (USE_MOCK) {
    await delay(200);
    const index = MOCK_ASSET_STATUSES.findIndex((s) => s.id === id);
    if (index < 0) throw new Error("Asset status not found.");
    const current = MOCK_ASSET_STATUSES[index];
    const nextSlug = input.slug?.trim().toLowerCase();
    if (
      nextSlug &&
      nextSlug !== current.slug &&
      MOCK_ASSET_STATUSES.some((s) => s.slug === nextSlug)
    ) {
      throw new Error("An asset status with this slug already exists.");
    }
    const updated: AssetStatus = {
      ...current,
      name: input.name !== undefined ? input.name.trim() : current.name,
      slug: nextSlug ?? current.slug,
      description:
        input.description !== undefined ? input.description : current.description,
      color:
        input.color !== undefined
          ? input.color.trim().toLowerCase()
          : current.color,
      sort_order:
        input.sort_order !== undefined ? input.sort_order : current.sort_order,
      updated_at: isoNow(),
    };
    const next = [...MOCK_ASSET_STATUSES];
    next[index] = updated;
    setMockAssetStatuses(next);
    return { success: true, data: updated, message: null };
  }
  throw new Error("Live API not enabled");
}

export async function deleteAssetStatus(id: string): Promise<void> {
  if (USE_MOCK) {
    await delay(150);
    const { MOCK_ASSETS } = await import("@/services/mock/data");
    const inUse = MOCK_ASSETS.some((a) => a.asset_status_id === id);
    if (inUse) {
      throw new Error("Cannot delete status while assets still use it.");
    }
    if (!MOCK_ASSET_STATUSES.some((s) => s.id === id)) {
      throw new Error("Asset status not found.");
    }
    setMockAssetStatuses(MOCK_ASSET_STATUSES.filter((s) => s.id !== id));
    return;
  }
  throw new Error("Live API not enabled");
}

export async function seedDefaultStatuses(): Promise<ApiListSuccess<AssetStatus>> {
  if (USE_MOCK) {
    await delay(200);
    const existing = new Set(MOCK_ASSET_STATUSES.map((s) => s.slug));
    const stamp = isoNow();
    const additions: AssetStatus[] = [];
    for (const item of DEFAULT_SEED) {
      if (existing.has(item.slug)) continue;
      additions.push({
        id: newId("status"),
        name: item.name,
        slug: item.slug,
        description: item.description ?? null,
        color: item.color,
        sort_order: item.sort_order ?? 0,
        created_at: stamp,
        updated_at: stamp,
      });
    }
    if (additions.length > 0) {
      setMockAssetStatuses([...MOCK_ASSET_STATUSES, ...additions]);
    }
    return listAssetStatuses();
  }
  throw new Error("Live API not enabled");
}
