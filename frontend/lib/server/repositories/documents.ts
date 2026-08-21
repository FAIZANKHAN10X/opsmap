import type { Database } from "@/types/database";

import { nowIso, type Client } from "@/lib/server/repositories/base";
import { toDatabaseError } from "@/lib/server/errors";
import { escapeIlike } from "@/lib/server/validation";

type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];
type DocumentInsert = Database["public"]["Tables"]["documents"]["Insert"];
type DocumentUpdate = Database["public"]["Tables"]["documents"]["Update"];

export type { DocumentRow, DocumentInsert, DocumentUpdate };

export type DocumentListParams = {
  page: number;
  limit: number;
  asset_id?: string | null;
  category?: string | null;
  search?: string | null;
  includeDeleted?: boolean;
};

export class DocumentRepository {
  constructor(private readonly client: Client) {}

  async getById(id: string, includeDeleted = false): Promise<DocumentRow | null> {
    let q = this.client.from("documents").select("*").eq("id", id);
    if (!includeDeleted) q = q.is("deleted_at", null);
    const { data, error } = await q.maybeSingle();
    if (error) throw toDatabaseError(error);
    return data;
  }

  async listByAsset(
    assetId: string,
    opts: { page: number; limit: number; category?: string | null; includeDeleted?: boolean },
  ): Promise<{ items: DocumentRow[]; total: number }> {
    let q = this.client.from("documents").select("*", { count: "exact" });
    if (!opts.includeDeleted) q = q.is("deleted_at", null);
    q = q.eq("asset_id", assetId);
    if (opts.category) q = q.eq("category", opts.category);
    const from = (opts.page - 1) * opts.limit;
    q = q.order("created_at", { ascending: false }).range(from, from + opts.limit - 1);
    const { data, count, error } = await q;
    if (error) throw toDatabaseError(error);
    return { items: (data ?? []) as DocumentRow[], total: count ?? 0 };
  }

  async listAll(opts: DocumentListParams): Promise<{ items: DocumentRow[]; total: number }> {
    let q = this.client.from("documents").select("*", { count: "exact" });
    if (!opts.includeDeleted) q = q.is("deleted_at", null);
    if (opts.asset_id) q = q.eq("asset_id", opts.asset_id);
    if (opts.category) q = q.eq("category", opts.category);
    if (opts.search && opts.search.trim()) {
      const pattern = `%${escapeIlike(opts.search.trim())}%`;
      q = q.or(`name.ilike.${pattern},filename.ilike.${pattern},notes.ilike.${pattern}`);
    }
    const from = (opts.page - 1) * opts.limit;
    q = q.order("created_at", { ascending: false }).range(from, from + opts.limit - 1);
    const { data, count, error } = await q;
    if (error) throw toDatabaseError(error);
    return { items: (data ?? []) as DocumentRow[], total: count ?? 0 };
  }

  async create(row: DocumentInsert): Promise<DocumentRow> {
    const { data, error } = await this.client
      .from("documents")
      .insert(row)
      .select("*")
      .single();
    if (error) throw toDatabaseError(error);
    return data;
  }

  async update(id: string, row: DocumentUpdate): Promise<DocumentRow> {
    const { data, error } = await this.client
      .from("documents")
      .update(row)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw toDatabaseError(error);
    return data;
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await this.client
      .from("documents")
      .update({ deleted_at: nowIso() })
      .eq("id", id);
    if (error) throw toDatabaseError(error);
  }
}