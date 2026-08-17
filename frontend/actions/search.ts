"use server";

import type { Asset } from "@/types/domain";

import { runAction, runListAction, withServerContext } from "@/lib/server/action-context";
import { toAsset } from "@/lib/server/mappers";
import { parsePagination } from "@/lib/server/pagination";
import { SearchService, type SearchSuggestion } from "@/lib/server/services/search";

export type SearchParams = {
  q?: string | null;
  project_id?: string | null;
  status?: string | null;
  type?: string | null;
  owner?: string | null;
  assigned_to?: string | null;
  created_after?: string | null;
  created_before?: string | null;
  sort?: string | null;
  order?: string | null;
  page?: number;
  limit?: number;
};

export async function searchAssets(params?: SearchParams) {
  return runListAction<Asset>(async () => {
    const { client } = await withServerContext();
    const { page, limit } = parsePagination(params?.page, params?.limit);
    const service = new SearchService(client);
    const { items, total } = await service.searchAssets({
      page,
      limit,
      project_id: params?.project_id ?? null,
      q: params?.q ?? null,
      status: params?.status ?? null,
      type_slug: params?.type ?? null,
      owner: params?.owner ?? null,
      assigned_to: params?.assigned_to ?? null,
      created_after: params?.created_after ?? null,
      created_before: params?.created_before ?? null,
      sort: params?.sort ?? "created_at",
      order: params?.order ?? "desc",
    });
    return { items: items.map(toAsset), total, page, limit };
  });
}

export async function searchSuggestions(
  q: string,
  opts?: { project_id?: string | null; limit?: number },
) {
  return runAction<SearchSuggestion[]>(async () => {
    const { client } = await withServerContext();
    const service = new SearchService(client);
    return service.suggestions(q, {
      project_id: opts?.project_id ?? null,
      limit: opts?.limit ?? 8,
    });
  });
}