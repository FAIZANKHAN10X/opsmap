import type { Database } from "@/types/database";

import { nowIso, type Client, type SortSpec } from "@/lib/server/repositories/base";
import { toDatabaseError } from "@/lib/server/errors";
import { ALLOWED_SORT_FIELDS } from "@/lib/server/constants";
import { escapeIlike } from "@/lib/server/validation";

type AssetRow = Database["public"]["Tables"]["assets"]["Row"];
type AssetInsert = Database["public"]["Tables"]["assets"]["Insert"];
type AssetUpdate = Database["public"]["Tables"]["assets"]["Update"];

export type { AssetRow, AssetInsert, AssetUpdate };

/**
 * PostgREST's logic-tree parser rejects type casts inside `or()` filters
 * (`assignees::text.ilike` fails with PGRST100) and its LIKE/ILIKE operators
 * ignore casts on the column. Match assignees via per-index `->>` access
 * instead: each condition is `assignees->>i`, and out-of-range indexes are
 * NULL (which naturally fails the ILIKE). Mirrors the original
 * `assignees::text ILIKE` substring semantics for realistic assignee counts.
 */
const ASSIGNEE_OR_MAX_INDEX = 7;

function assigneeOr(pattern: string): string {
  return Array.from({ length: ASSIGNEE_OR_MAX_INDEX + 1 }, (_, i) => `assignees->>${i}.ilike.${pattern}`).join(",");
}

export type AssetListFilters = {
  page: number;
  limit: number;
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
  /** Geographic placement filter for the real map. */
  placement?: "placed" | "unplaced" | null;
  includeDeleted?: boolean;
};

export class AssetRepository {
  constructor(private readonly client: Client) {}

  async getById(id: string, includeDeleted = false): Promise<AssetRow | null> {
    let q = this.client.from("assets").select("*").eq("id", id);
    if (!includeDeleted) q = q.is("deleted_at", null);
    const { data, error } = await q.maybeSingle();
    if (error) throw toDatabaseError(error);
    return data;
  }

  /**
   * list_filtered equivalent. Supports id filters, slug-based type/status
   * filters (resolved via a join-equivalent subquery on the related tables),
   * ILIKE search over text columns + JSONB assignees, owner/assignee matching,
   * created_after/before, whitelisted sort + order, and pagination.
   */
  async listFiltered(opts: AssetListFilters): Promise<{ items: AssetRow[]; total: number }> {
    let q = this.client.from("assets").select("*", { count: "exact" });
    if (!opts.includeDeleted) q = q.is("deleted_at", null);

    if (opts.project_id) q = q.eq("project_id", opts.project_id);
    if (opts.asset_type_id) q = q.eq("asset_type_id", opts.asset_type_id);
    if (opts.asset_status_id) q = q.eq("asset_status_id", opts.asset_status_id);

    // Geographic placement filter (real map). A property is "placed" only
    // when both WGS84 columns are set.
    if (opts.placement === "placed") {
      q = q.not("latitude", "is", null).not("longitude", "is", null);
    } else if (opts.placement === "unplaced") {
      q = q.or("latitude.is.null,longitude.is.null");
    }

    // Type slug → resolve matching (non-deleted) type ids, then filter in-list.
    if (opts.type_slug) {
      const ids = await this.resolveSlugIds("asset_types", opts.type_slug);
      q = q.in("asset_type_id", ids);
    }
    if (opts.type_slugs && opts.type_slugs.length > 0) {
      const ids = new Set<string>();
      for (const slug of opts.type_slugs) {
        for (const id of await this.resolveSlugIds("asset_types", slug)) {
          ids.add(id);
        }
      }
      q = q.in("asset_type_id", [...ids]);
    }
    if (opts.status_slug) {
      const ids = await this.resolveSlugIds("asset_statuses", opts.status_slug);
      q = q.in("asset_status_id", ids);
    }
    if (opts.status_slugs && opts.status_slugs.length > 0) {
      const ids = new Set<string>();
      for (const slug of opts.status_slugs) {
        for (const id of await this.resolveSlugIds("asset_statuses", slug)) {
          ids.add(id);
        }
      }
      q = q.in("asset_status_id", [...ids]);
    }

    if (opts.search && opts.search.trim()) {
      const pattern = `%${escapeIlike(opts.search.trim())}%`;
      q = q.or(
        `name.ilike.${pattern},code.ilike.${pattern},description.ilike.${pattern},owner.ilike.${pattern},notes.ilike.${pattern},${assigneeOr(pattern)}`,
      );
    }
    if (opts.owner && opts.owner.trim()) {
      q = q.ilike("owner", `%${escapeIlike(opts.owner.trim())}%`);
    }
    if (opts.assigned_to && opts.assigned_to.trim()) {
      q = q.or(assigneeOr(`%${escapeIlike(opts.assigned_to.trim())}%`));
    }
    if (opts.created_after) q = q.gte("created_at", opts.created_after);
    if (opts.created_before) q = q.lte("created_at", opts.created_before);

    const sortKey = ALLOWED_SORT_FIELDS.has(opts.sort ?? "")
      ? (opts.sort as string)
      : "created_at";
    const order = opts.order?.toLowerCase() === "asc" ? "asc" : "desc";
    const spec: SortSpec = { column: sortKey, order };
    q = q.order(spec.column, { ascending: spec.order === "asc" });

    const from = (opts.page - 1) * opts.limit;
    q = q.range(from, from + opts.limit - 1);
    const { data, count, error } = await q;
    if (error) throw toDatabaseError(error);
    return { items: (data ?? []) as AssetRow[], total: count ?? 0 };
  }

  /** suggest equivalent: lightweight keyword suggestions for autocomplete. */
  async suggest(
    query: string,
    opts: { project_id?: string | null; limit?: number },
  ): Promise<AssetRow[]> {
    const q = query.trim();
    if (!q) return [];
    const pattern = `%${escapeIlike(q)}%`;
    let b = this.client
      .from("assets")
      .select("*")
      .is("deleted_at", null)
      .or(`name.ilike.${pattern},code.ilike.${pattern},owner.ilike.${pattern}`);
    if (opts.project_id) b = b.eq("project_id", opts.project_id);
    b = b.order("updated_at", { ascending: false }).limit(opts.limit ?? 8);
    const { data, error } = await b;
    if (error) throw toDatabaseError(error);
    return (data ?? []) as AssetRow[];
  }

  async create(row: AssetInsert): Promise<AssetRow> {
    const { data, error } = await this.client
      .from("assets")
      .insert(row)
      .select("*")
      .single();
    if (error) throw toDatabaseError(error);
    return data;
  }

  async update(id: string, row: AssetUpdate): Promise<AssetRow> {
    const { data, error } = await this.client
      .from("assets")
      .update(row)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw toDatabaseError(error);
    return data;
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await this.client
      .from("assets")
      .update({ deleted_at: nowIso() })
      .eq("id", id);
    if (error) throw toDatabaseError(error);
  }

  private async resolveSlugIds(
    table: "asset_types" | "asset_statuses",
    slug: string,
  ): Promise<string[]> {
    const { data, error } = await this.client
      .from(table)
      .select("id")
      .eq("slug", slug)
      .is("deleted_at", null);
    if (error) throw toDatabaseError(error);
    const ids = (data ?? []).map((r) => r.id);
    // Backend used in_([None]) when no match — matches nothing.
    return ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"];
  }
}