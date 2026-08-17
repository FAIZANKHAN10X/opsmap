import type { Database } from "@/types/database";

import { asc, nowIso, type Client, type SortSpec } from "@/lib/server/repositories/base";
import { toDatabaseError } from "@/lib/server/errors";

type AssetStatusRow = Database["public"]["Tables"]["asset_statuses"]["Row"];
type AssetStatusInsert = Database["public"]["Tables"]["asset_statuses"]["Insert"];
type AssetStatusUpdate = Database["public"]["Tables"]["asset_statuses"]["Update"];

export type { AssetStatusRow, AssetStatusInsert, AssetStatusUpdate };

export class AssetStatusRepository {
  constructor(private readonly client: Client) {}

  async getById(id: string, includeDeleted = false): Promise<AssetStatusRow | null> {
    let q = this.client.from("asset_statuses").select("*").eq("id", id);
    if (!includeDeleted) q = q.is("deleted_at", null);
    const { data, error } = await q.maybeSingle();
    if (error) throw toDatabaseError(error);
    return data;
  }

  async list(opts: {
    page: number;
    limit: number;
    includeDeleted?: boolean;
    sort?: SortSpec;
  }): Promise<{ items: AssetStatusRow[]; total: number }> {
    let q = this.client.from("asset_statuses").select("*", { count: "exact" });
    if (!opts.includeDeleted) q = q.is("deleted_at", null);
    const sort = opts.sort ?? asc("sort_order");
    q = q.order(sort.column, { ascending: sort.order === "asc" });
    q = q.order("name", { ascending: true });
    const from = (opts.page - 1) * opts.limit;
    q = q.range(from, from + opts.limit - 1);
    const { data, count, error } = await q;
    if (error) throw toDatabaseError(error);
    return { items: (data ?? []) as AssetStatusRow[], total: count ?? 0 };
  }

  async existsSlug(slug: string, excludeId?: string): Promise<boolean> {
    let q = this.client
      .from("asset_statuses")
      .select("id")
      .eq("slug", slug)
      .is("deleted_at", null);
    if (excludeId) q = q.neq("id", excludeId);
    const { data, error } = await q.limit(1).maybeSingle();
    if (error) throw toDatabaseError(error);
    return data !== null;
  }

  async getBySlug(slug: string): Promise<AssetStatusRow | null> {
    const { data, error } = await this.client
      .from("asset_statuses")
      .select("*")
      .eq("slug", slug)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    if (error) throw toDatabaseError(error);
    return data;
  }

  async countAssetsUsing(statusId: string): Promise<number> {
    const { count, error } = await this.client
      .from("assets")
      .select("id", { count: "exact", head: true })
      .eq("asset_status_id", statusId)
      .is("deleted_at", null);
    if (error) throw toDatabaseError(error);
    return count ?? 0;
  }

  async create(row: AssetStatusInsert): Promise<AssetStatusRow> {
    const { data, error } = await this.client
      .from("asset_statuses")
      .insert(row)
      .select("*")
      .single();
    if (error) throw toDatabaseError(error);
    return data;
  }

  async update(id: string, row: AssetStatusUpdate): Promise<AssetStatusRow> {
    const { data, error } = await this.client
      .from("asset_statuses")
      .update(row)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw toDatabaseError(error);
    return data;
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await this.client
      .from("asset_statuses")
      .update({ deleted_at: nowIso() })
      .eq("id", id);
    if (error) throw toDatabaseError(error);
  }
}