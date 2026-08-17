import type { Database } from "@/types/database";

import { desc, nowIso, type Client, type SortSpec } from "@/lib/server/repositories/base";
import { toDatabaseError } from "@/lib/server/errors";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

export type { ProjectRow, ProjectInsert, ProjectUpdate };

export class ProjectRepository {
  constructor(private readonly client: Client) {}

  async getById(id: string, includeDeleted = false): Promise<ProjectRow | null> {
    let q = this.client.from("projects").select("*").eq("id", id);
    if (!includeDeleted) q = q.is("deleted_at", null);
    const { data, error } = await q.maybeSingle();
    if (error) throw toDatabaseError(error);
    return data;
  }

  async list(opts: {
    page: number;
    limit: number;
    status?: string | null;
    includeDeleted?: boolean;
    sort?: SortSpec;
  }): Promise<{ items: ProjectRow[]; total: number }> {
    let q = this.client
      .from("projects")
      .select("*", { count: "exact" });
    if (!opts.includeDeleted) q = q.is("deleted_at", null);
    if (opts.status) q = q.eq("status", opts.status);
    const sort = opts.sort ?? desc("created_at");
    q = q.order(sort.column, { ascending: sort.order === "asc" });
    const from = (opts.page - 1) * opts.limit;
    q = q.range(from, from + opts.limit - 1);
    const { data, count, error } = await q;
    if (error) throw toDatabaseError(error);
    return { items: (data ?? []) as ProjectRow[], total: count ?? 0 };
  }

  async existsSlug(slug: string, excludeId?: string): Promise<boolean> {
    let q = this.client
      .from("projects")
      .select("id")
      .eq("slug", slug)
      .is("deleted_at", null);
    if (excludeId) q = q.neq("id", excludeId);
    const { data, error } = await q.limit(1).maybeSingle();
    if (error) throw toDatabaseError(error);
    return data !== null;
  }

  async create(row: ProjectInsert): Promise<ProjectRow> {
    const { data, error } = await this.client
      .from("projects")
      .insert(row)
      .select("*")
      .single();
    if (error) throw toDatabaseError(error);
    return data;
  }

  async update(id: string, row: ProjectUpdate): Promise<ProjectRow> {
    const { data, error } = await this.client
      .from("projects")
      .update(row)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw toDatabaseError(error);
    return data;
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await this.client
      .from("projects")
      .update({ deleted_at: nowIso() })
      .eq("id", id);
    if (error) throw toDatabaseError(error);
  }
}