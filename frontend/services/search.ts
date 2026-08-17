/**
 * Search service — delegates to Server Actions backed by Supabase.
 * Mirrors GET /api/v1/search and /search/suggestions.
 */

import type {
  ApiListSuccess,
  ApiSuccess,
  Asset,
} from "@/types/domain";

import {
  searchAssets as searchAssetsAction,
  searchSuggestions as searchSuggestionsAction,
} from "@/actions/search";
import { unwrapAction, unwrapListAction } from "@/services/helpers";

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

export async function searchAssets(
  params: SearchParams = {},
): Promise<ApiListSuccess<Asset>> {
  return unwrapListAction(
    await searchAssetsAction({
      q: params.q ?? null,
      project_id: params.project_id ?? null,
      status: params.status ?? null,
      type: params.type ?? null,
      owner: params.owner ?? null,
      assigned_to: params.assigned_to ?? null,
      created_after: params.created_after ?? null,
      created_before: params.created_before ?? null,
      sort: params.sort ?? "created_at",
      order: params.order ?? "desc",
      page: params.page,
      limit: params.limit,
    }),
  );
}

export async function searchSuggestions(
  q: string,
  opts?: { project_id?: string; limit?: number },
): Promise<ApiSuccess<SearchSuggestion[]>> {
  return unwrapAction(
    await searchSuggestionsAction(q, {
      project_id: opts?.project_id ?? null,
      limit: opts?.limit,
    }),
  );
}