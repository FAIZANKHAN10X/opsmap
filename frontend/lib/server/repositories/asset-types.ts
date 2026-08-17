import type { Database } from "@/types/database";

import { asc, type Client, type SortSpec } from "@/lib/server/repositories/base";
import { toDatabaseError } from "@/lib/server/errors";

type AssetTypeRow = Database["public"]["Tables"]["asset_types"]["Row"];
type AssetTypeInsert = Database["public"]["Tables"]["asset_types"]["Insert"];
type AssetTypeUpdate = Database["public"]["Tables"]["asset_types"]["Update"];

export type { AssetTypeRow, AssetTypeInsert, AssetTypeUpdate };

export class AssetTypeRepository {
  constructor(private readonly client: Client) {}

  async getById(id: string, includeDeleted = false): Promise<AssetTypeRow | null> {
    let q = this.client.from("asset_types").select("*").eq("id", id);
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
  }): Promise<{ items: AssetTypeRow[]; total: number }> {
    let q = this.client.from("asset_types").select("*", { count: "exact" });
    if (!opts.includeDeleted) q = q.is("deleted_at", null);
    const sort = opts.sort ?? asc("sort_order");
    q = q.order(sort.column, { ascending: sort.order === "asc" });
    q = q.order("name", { ascending: true });
    const from = (opts.page - 1) * opts.limit;
    q = q.range(from, from + opts.limit - 1);
    const { data, count, error } = await q;
    if (error) throw toDatabaseError(error);
    return { items: (data ?? []) as AssetTypeRow[], total: count ?? 0 };
  }

  async existsSlug(slug: string, excludeId?: string): Promise<boolean> {
    let q = this.client
      .from("asset_types")
      .select("id")
      .eq("slug", slug)
      .is("deleted_at", null);
    if (excludeId) q = q.neq("id", excludeId);
    const { data, error } = await q.limit(1).maybeSingle();
    if (error) throw toDatabaseError(error);
    return data !== null;
  }

  async create(row: AssetTypeInsert): Promise<AssetTypeRow> {
    const { data, error } = await this.client
      .from("asset_types")
      .insert(row)
      .select("*")
      .single();
    if (error) throw toDatabaseError(error);
    return data;
  }

  async update(id: string, row: AssetTypeUpdate): Promise<AssetTypeRow> {
    const { data, error } = await this.client
      .from("asset_types")
      .update(row)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw toDatabaseError(error);
    return data;
  }
}