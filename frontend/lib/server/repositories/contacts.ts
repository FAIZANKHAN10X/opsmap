import type { Database } from "@/types/database";

import { nowIso, type Client } from "@/lib/server/repositories/base";
import { toDatabaseError } from "@/lib/server/errors";

type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];
type ContactInsert = Database["public"]["Tables"]["contacts"]["Insert"];
type ContactUpdate = Database["public"]["Tables"]["contacts"]["Update"];
type PropertyContactRow = Database["public"]["Tables"]["property_contacts"]["Row"];
type PropertyContactInsert =
  Database["public"]["Tables"]["property_contacts"]["Insert"];

export type { ContactRow, ContactInsert, ContactUpdate, PropertyContactRow, PropertyContactInsert };

export type ContactListFilters = {
  page: number;
  limit: number;
  search?: string | null;
  type?: string | null;
  includeDeleted?: boolean;
};

export class ContactRepository {
  constructor(private readonly client: Client) {}

  async getById(id: string, includeDeleted = false): Promise<ContactRow | null> {
    let q = this.client.from("contacts").select("*").eq("id", id);
    if (!includeDeleted) q = q.is("deleted_at", null);
    const { data, error } = await q.maybeSingle();
    if (error) throw toDatabaseError(error);
    return data;
  }

  async list(opts: ContactListFilters): Promise<{ items: ContactRow[]; total: number }> {
    let q = this.client.from("contacts").select("*", { count: "exact" });
    if (!opts.includeDeleted) q = q.is("deleted_at", null);
    if (opts.type) q = q.eq("type", opts.type);
    if (opts.search && opts.search.trim()) {
      const pattern = `%${opts.search.trim()}%`;
      q = q.or(`full_name.ilike.${pattern},company.ilike.${pattern},email.ilike.${pattern}`);
    }
    q = q.order("full_name", { ascending: true });
    const from = (opts.page - 1) * opts.limit;
    q = q.range(from, from + opts.limit - 1);
    const { data, count, error } = await q;
    if (error) throw toDatabaseError(error);
    return { items: (data ?? []) as ContactRow[], total: count ?? 0 };
  }

  /** Fetch active contacts by ids (used to resolve property links). */
  async listByIds(ids: string[]): Promise<ContactRow[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.client
      .from("contacts")
      .select("*")
      .in("id", ids)
      .is("deleted_at", null);
    if (error) throw toDatabaseError(error);
    return (data ?? []) as ContactRow[];
  }

  async create(row: ContactInsert): Promise<ContactRow> {
    const { data, error } = await this.client
      .from("contacts")
      .insert(row)
      .select("*")
      .single();
    if (error) throw toDatabaseError(error);
    return data;
  }

  async update(id: string, row: ContactUpdate): Promise<ContactRow> {
    const { data, error } = await this.client
      .from("contacts")
      .update(row)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw toDatabaseError(error);
    return data;
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await this.client
      .from("contacts")
      .update({ deleted_at: nowIso() })
      .eq("id", id);
    if (error) throw toDatabaseError(error);
  }
}

/**
 * Relational join between properties (assets) and contacts. Rows are hard
 * deleted (no soft-delete column) and cascade when either side is removed.
 */
export class PropertyContactRepository {
  constructor(private readonly client: Client) {}

  async listByContactIds(contactIds: string[]): Promise<PropertyContactRow[]> {
    if (contactIds.length === 0) return [];
    const { data, error } = await this.client
      .from("property_contacts")
      .select("*")
      .in("contact_id", contactIds);
    if (error) throw toDatabaseError(error);
    return (data ?? []) as PropertyContactRow[];
  }

  async listByAssetId(assetId: string): Promise<PropertyContactRow[]> {
    const { data, error } = await this.client
      .from("property_contacts")
      .select("*")
      .eq("asset_id", assetId);
    if (error) throw toDatabaseError(error);
    return (data ?? []) as PropertyContactRow[];
  }

  async deleteByContactId(contactId: string): Promise<void> {
    const { error } = await this.client
      .from("property_contacts")
      .delete()
      .eq("contact_id", contactId);
    if (error) throw toDatabaseError(error);
  }

  /**
   * Replaces the full association set for a contact: removes all existing
   * links, then inserts the new ones. Callers pass deduped links (the DB
   * unique constraint also guards duplicates).
   */
  async replaceForContact(
    contactId: string,
    links: Array<{ asset_id: string; role: string }>,
  ): Promise<void> {
    await this.deleteByContactId(contactId);
    for (const link of links) {
      const row: PropertyContactInsert = {
        id: crypto.randomUUID(),
        asset_id: link.asset_id,
        contact_id: contactId,
        role: link.role,
      };
      const { error } = await this.client.from("property_contacts").insert(row);
      if (error) throw toDatabaseError(error);
    }
  }

  async insert(row: PropertyContactInsert): Promise<void> {
    const { error } = await this.client.from("property_contacts").insert(row);
    if (error) throw toDatabaseError(error);
  }
}