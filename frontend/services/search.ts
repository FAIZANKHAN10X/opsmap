/**
 * Search service (mock) — mirrors GET /api/v1/search and /search/suggestions.
 */

import type {
  ApiListSuccess,
  ApiSuccess,
  Asset,
  AssetStatus,
  AssetType,
} from "@/types/domain";

import {
  MOCK_ASSETS,
  MOCK_ASSET_STATUSES,
  MOCK_ASSET_TYPES,
  mockForceError,
} from "@/services/mock/data";
import { delay } from "@/services/mock/delay";

const USE_MOCK = true;

export type SearchParams = {
  q?: string;
  project_id?: string;
  status?: string;
  type?: string;
  owner?: string;
  assigned_to?: string;
  created_after?: string;
  created_before?: string;
  sort?: "name" | "code" | "owner" | "created_at" | "updated_at";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
};

export type SearchSuggestion = {
  id: string;
  name: string;
  code: string | null;
  project_id: string;
  owner: string | null;
  asset_status_id: string | null;
  label: string;
};

function statusBySlug(slug: string): AssetStatus | undefined {
  return MOCK_ASSET_STATUSES.find((s) => s.slug === slug);
}

function typeBySlug(slug: string): AssetType | undefined {
  return MOCK_ASSET_TYPES.find((t) => t.slug === slug);
}

function applyFilters(params: SearchParams): Asset[] {
  let data = [...MOCK_ASSETS];

  if (params.project_id) {
    data = data.filter((a) => a.project_id === params.project_id);
  }
  if (params.status) {
    const st = statusBySlug(params.status);
    data = data.filter((a) => a.asset_status_id === st?.id);
  }
  if (params.type) {
    const ty = typeBySlug(params.type);
    data = data.filter((a) => a.asset_type_id === ty?.id);
  }
  if (params.owner?.trim()) {
    const q = params.owner.trim().toLowerCase();
    data = data.filter((a) => a.owner?.toLowerCase().includes(q));
  }
  if (params.assigned_to?.trim()) {
    const q = params.assigned_to.trim().toLowerCase();
    data = data.filter((a) =>
      a.assignees.some((name) => name.toLowerCase().includes(q)),
    );
  }
  if (params.created_after) {
    const after = new Date(params.created_after).getTime();
    data = data.filter((a) => new Date(a.created_at).getTime() >= after);
  }
  if (params.created_before) {
    const before = new Date(params.created_before).getTime();
    data = data.filter((a) => new Date(a.created_at).getTime() <= before);
  }
  if (params.q?.trim()) {
    const q = params.q.trim().toLowerCase();
    data = data.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.code?.toLowerCase().includes(q) ?? false) ||
        (a.description?.toLowerCase().includes(q) ?? false) ||
        (a.owner?.toLowerCase().includes(q) ?? false) ||
        (a.notes?.toLowerCase().includes(q) ?? false) ||
        a.assignees.some((n) => n.toLowerCase().includes(q)),
    );
  }

  const sort = params.sort ?? "created_at";
  const order = params.order ?? "desc";
  data.sort((a, b) => {
    const av = String(a[sort] ?? "");
    const bv = String(b[sort] ?? "");
    const cmp = av.localeCompare(bv, undefined, { sensitivity: "base" });
    return order === "asc" ? cmp : -cmp;
  });

  return data;
}

export async function searchAssets(
  params: SearchParams = {},
): Promise<ApiListSuccess<Asset>> {
  if (USE_MOCK) {
    await delay(250);
    if (mockForceError) throw new Error("Search failed.");
    const filtered = applyFilters(params);
    const page = params.page ?? 1;
    const limit = params.limit ?? 25;
    const start = (page - 1) * limit;
    const slice = filtered.slice(start, start + limit);
    return {
      success: true,
      data: slice,
      pagination: {
        page,
        limit,
        total: filtered.length,
        pages: filtered.length === 0 ? 0 : Math.ceil(filtered.length / limit),
      },
      message: null,
    };
  }
  throw new Error("Live API not enabled");
}

export async function searchSuggestions(
  q: string,
  opts?: { project_id?: string; limit?: number },
): Promise<ApiSuccess<SearchSuggestion[]>> {
  if (USE_MOCK) {
    await delay(120);
    const query = q.trim().toLowerCase();
    if (!query) {
      return { success: true, data: [], message: null };
    }
    let data = [...MOCK_ASSETS];
    if (opts?.project_id) {
      data = data.filter((a) => a.project_id === opts.project_id);
    }
    data = data.filter(
      (a) =>
        a.name.toLowerCase().includes(query) ||
        (a.code?.toLowerCase().includes(query) ?? false) ||
        (a.owner?.toLowerCase().includes(query) ?? false),
    );
    const limit = opts?.limit ?? 8;
    const suggestions: SearchSuggestion[] = data.slice(0, limit).map((a) => ({
      id: a.id,
      name: a.name,
      code: a.code,
      project_id: a.project_id,
      owner: a.owner,
      asset_status_id: a.asset_status_id,
      label: `${a.code ? `${a.code} · ` : ""}${a.name}${a.owner ? ` — ${a.owner}` : ""}`,
    }));
    return { success: true, data: suggestions, message: null };
  }
  throw new Error("Live API not enabled");
}
