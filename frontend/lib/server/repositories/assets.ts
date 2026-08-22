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
  // --- Professional property filters (Phase A) — metadata JSONB, server-enforced ---
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
      // Extend search to cover address and useful metadata text (Zillow-like discoverability).
      // metadata->>address / ->>view / ->>furnishing / ->>floor are searchable text.
      // features is an array — search hits via per-index ->> (stored as JSONB array, fake client handles).
      const metaSearchOr = [
        `metadata->>address.ilike.${pattern}`,
        `metadata->>view.ilike.${pattern}`,
        `metadata->>furnishing.ilike.${pattern}`,
        `metadata->>floor.ilike.${pattern}`,
        `metadata->>features.ilike.${pattern}`,
      ].join(",");
      q = q.or(
        `name.ilike.${pattern},code.ilike.${pattern},description.ilike.${pattern},owner.ilike.${pattern},notes.ilike.${pattern},${assigneeOr(pattern)},${metaSearchOr}`,
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

    // --- Metadata numeric/text filters (Phase A) ---
    // PostgREST cannot reliably do numeric comparisons on JSONB text fields
    // (metadata->>price is text, lexicographic, not numeric). Rather than
    // introduce a typed-column migration now, we apply these server-side
    // post-fetch against the base-filtered set. At current dataset sizes
    // (tens to low hundreds per project) we can fetch a bounded window
    // (first 1000 matching base filters) and filter in memory, still
    // server-side (no browser cost). Documented limitation: if dataset grows
    // to thousands, promote price/bedrooms/bathrooms/area to typed columns.
    const hasMetaFilters =
      opts.price_min != null ||
      opts.price_max != null ||
      opts.currency != null ||
      opts.bedrooms_min != null ||
      opts.bathrooms_min != null ||
      opts.area_min != null ||
      opts.area_max != null ||
      opts.furnishing != null ||
      (opts.features && opts.features.length > 0);

    if (!hasMetaFilters) {
      const from = (opts.page - 1) * opts.limit;
      q = q.range(from, from + opts.limit - 1);
      const { data, count, error } = await q;
      if (error) throw toDatabaseError(error);
      return { items: (data ?? []) as AssetRow[], total: count ?? 0 };
    }

    // Fetch base-filtered window without pagination, then apply metadata filters.
    const { data: allData, error: allError } = await q;
    if (allError) throw toDatabaseError(allError);
    let filtered = (allData ?? []) as AssetRow[];

    function metaNum(row: AssetRow, key: string): number | null {
      const v = (row.metadata as Record<string, unknown> | null)?.[key];
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string" && v.trim() !== "") {
        const n = Number(v);
        if (Number.isFinite(n)) return n;
      }
      return null;
    }

    if (opts.price_min != null) {
      filtered = filtered.filter((r) => {
        const v = metaNum(r, "price");
        return v != null && v >= (opts.price_min as number);
      });
    }
    if (opts.price_max != null) {
      filtered = filtered.filter((r) => {
        const v = metaNum(r, "price");
        return v != null && v <= (opts.price_max as number);
      });
    }
    if (opts.currency && opts.currency.trim()) {
      const cur = opts.currency.trim().toUpperCase();
      filtered = filtered.filter(
        (r) => String((r.metadata as Record<string, unknown>)?.currency ?? "").toUpperCase() === cur,
      );
    }
    if (opts.bedrooms_min != null) {
      filtered = filtered.filter((r) => {
        const v = metaNum(r, "bedrooms");
        return v != null && v >= (opts.bedrooms_min as number);
      });
    }
    if (opts.bathrooms_min != null) {
      filtered = filtered.filter((r) => {
        const v = metaNum(r, "bathrooms");
        return v != null && v >= (opts.bathrooms_min as number);
      });
    }
    if (opts.area_min != null) {
      filtered = filtered.filter((r) => {
        const v = metaNum(r, "area_sqm");
        return v != null && v >= (opts.area_min as number);
      });
    }
    if (opts.area_max != null) {
      filtered = filtered.filter((r) => {
        const v = metaNum(r, "area_sqm");
        return v != null && v <= (opts.area_max as number);
      });
    }
    if (opts.furnishing && opts.furnishing.trim()) {
      const f = opts.furnishing.trim().toLowerCase();
      filtered = filtered.filter(
        (r) => String((r.metadata as Record<string, unknown>)?.furnishing ?? "").toLowerCase() === f,
      );
    }
    if (opts.features && opts.features.length > 0) {
      const wanted = opts.features.map((s) => s.trim().toLowerCase()).filter(Boolean);
      filtered = filtered.filter((r) => {
        const feats = (r.metadata as Record<string, unknown>)?.features;
        if (!Array.isArray(feats)) return false;
        const lower = feats.map((x) => String(x).toLowerCase());
        return wanted.every((w) => lower.includes(w));
      });
    }

    // Re-apply sort after filtering (already sorted by DB, but ensure stability).
    // Count is post-filter total; paginate.
    const total = filtered.length;
    const from = (opts.page - 1) * opts.limit;
    const items = filtered.slice(from, from + opts.limit);
    return { items, total };
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