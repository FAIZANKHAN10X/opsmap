import {
  NotFoundError,
  toDatabaseError,
  ValidationAppError,
} from "@/lib/server/errors";
import {
  ContactRepository,
  PropertyContactRepository,
  type ContactRow,
  type PropertyContactRow,
} from "@/lib/server/repositories/contacts";
import { CONTACT_TYPES, PROPERTY_CONTACT_ROLES } from "@/lib/server/constants";
import { requireUuid } from "@/lib/server/validation";
import { assertPagination } from "@/lib/server/pagination";
import { requireRole } from "@/lib/server/authorize";
import { audit } from "@/lib/server/audit";
import type { Client } from "@/lib/server/repositories/base";
import type { Actor } from "@/lib/server/authorize";
import type { ContactPropertyLink } from "@/types/domain";

export type ContactCreateInput = {
  type: string;
  full_name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  notes?: string | null;
  properties?: Array<{ asset_id: string; role: string }>;
};

export type ContactUpdateInput = {
  type?: string;
  full_name?: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  notes?: string | null;
  properties?: Array<{ asset_id: string; role: string }>;
};

export type ContactLink = ContactPropertyLink & { contact_id: string };

function normalizeType(value: string): string {
  const type = value.trim();
  if (!CONTACT_TYPES.has(type)) {
    throw new ValidationAppError("Invalid contact type.", [
      { field: "type", message: "Invalid contact type." },
    ]);
  }
  return type;
}

function normalizeRole(value: string): string {
  const role = value.trim();
  if (!PROPERTY_CONTACT_ROLES.has(role)) {
    throw new ValidationAppError("Invalid property contact role.", [
      { field: "role", message: "Invalid property contact role." },
    ]);
  }
  return role;
}

function requireName(value: string): string {
  const name = value.trim();
  if (!name) {
    throw new ValidationAppError("full_name is required", [
      { field: "full_name", message: "full_name is required" },
    ]);
  }
  if (name.length > 255) {
    throw new ValidationAppError("full_name must be at most 255 characters.", [
      { field: "full_name", message: "full_name must be at most 255 characters." },
    ]);
  }
  return name;
}

export class ContactService {
  private readonly repo: ContactRepository;
  private readonly propertyRepo: PropertyContactRepository;

  constructor(
    private readonly client: Client,
    private readonly opts: { actor?: Actor | null } = {},
  ) {
    this.repo = new ContactRepository(client);
    this.propertyRepo = new PropertyContactRepository(client);
  }

  async get(contactId: string): Promise<{ contact: ContactRow; links: ContactLink[] }> {
    requireUuid(contactId, "contact_id");
    const contact = await this.repo.getById(contactId);
    if (!contact) throw new NotFoundError("CONTACT_NOT_FOUND", "Contact not found.");
    const rows = await this.propertyRepo.listByContactIds([contact.id]);
    return { contact, links: await this.resolveLinks(rows) };
  }

  async list(opts: {
    page: number;
    limit: number;
    search?: string | null;
    type?: string | null;
  }): Promise<{
    items: ContactRow[];
    total: number;
    linksByContactId: Record<string, ContactLink[]>;
  }> {
    assertPagination(opts.page, opts.limit);
    const { items, total } = await this.repo.list({
      page: opts.page,
      limit: opts.limit,
      search: opts.search,
      type: opts.type,
    });
    if (items.length === 0) return { items, total, linksByContactId: {} };
    const rows = await this.propertyRepo.listByContactIds(items.map((c) => c.id));
    const links = await this.resolveLinks(rows);
    const linksByContactId: Record<string, ContactLink[]> = {};
    for (const link of links) {
      (linksByContactId[link.contact_id] ??= []).push(link);
    }
    return { items, total, linksByContactId };
  }

  /** Contacts linked to a specific property (used on property details). */
  async listByAssetId(
    assetId: string,
  ): Promise<Array<{ contact: ContactRow; link: PropertyContactRow }>> {
    requireUuid(assetId, "asset_id");
    const rows = await this.propertyRepo.listByAssetId(assetId);
    if (rows.length === 0) return [];
    const contactIds = [...new Set(rows.map((r) => r.contact_id))];
    const contacts = await this.repo.listByIds(contactIds);
    const byId = new Map(contacts.map((c) => [c.id, c]));
    return rows
      .filter((r) => byId.has(r.contact_id))
      .map((r) => ({ contact: byId.get(r.contact_id) as ContactRow, link: r }));
  }

  async create(payload: ContactCreateInput): Promise<{ contact: ContactRow; links: ContactPropertyLink[] }> {
    requireRole(this.opts.actor ?? null, "operator", "create", "contact");
    const fullName = requireName(payload.full_name);
    const type = normalizeType(payload.type || "other");
    let links = await this.validateAndDedupeLinks(payload.properties ?? []);

    const actorId = this.opts.actor?.id ?? null;
    const contact = await this.repo.create({
      id: crypto.randomUUID(),
      type,
      full_name: fullName,
      company: payload.company?.trim() || null,
      email: payload.email?.trim() || null,
      phone: payload.phone?.trim() || null,
      whatsapp: payload.whatsapp?.trim() || null,
      notes: payload.notes ?? null,
      created_by: actorId,
      updated_by: actorId,
    });
    if (links.length > 0) {
      await this.propertyRepo.replaceForContact(
        contact.id,
        links.map((l) => ({ asset_id: l.asset_id, role: l.role })),
      );
      const rows = await this.propertyRepo.listByContactIds([contact.id]);
      links = await this.resolveLinks(rows);
    }
    audit("contact.created", {
      contact_id: contact.id,
      full_name: contact.full_name,
      type: contact.type,
      property_count: links.length,
      created_by: actorId ?? undefined,
    });
    return { contact, links };
  }

  async update(
    contactId: string,
    payload: ContactUpdateInput,
  ): Promise<{ contact: ContactRow; links: ContactPropertyLink[] }> {
    requireRole(this.opts.actor ?? null, "operator", "update", "contact");
    requireUuid(contactId, "contact_id");
    const existing = await this.repo.getById(contactId);
    if (!existing) throw new NotFoundError("CONTACT_NOT_FOUND", "Contact not found.");

    const data: Partial<{
      type: string;
      full_name: string;
      company: string | null;
      email: string | null;
      phone: string | null;
      whatsapp: string | null;
      notes: string | null;
      updated_by: string | null;
    }> = {};

    if (payload.type !== undefined) data.type = normalizeType(payload.type);
    if (payload.full_name !== undefined) data.full_name = requireName(payload.full_name);
    if (payload.company !== undefined) data.company = payload.company?.trim() || null;
    if (payload.email !== undefined) data.email = payload.email?.trim() || null;
    if (payload.phone !== undefined) data.phone = payload.phone?.trim() || null;
    if (payload.whatsapp !== undefined) data.whatsapp = payload.whatsapp?.trim() || null;
    if (payload.notes !== undefined) data.notes = payload.notes;
    data.updated_by = this.opts.actor?.id ?? null;

    const contact = await this.repo.update(contactId, data);

    let links: ContactPropertyLink[] = [];
    if (payload.properties !== undefined) {
      const validated = await this.validateAndDedupeLinks(payload.properties);
      await this.propertyRepo.replaceForContact(
        contactId,
        validated.map((l) => ({ asset_id: l.asset_id, role: l.role })),
      );
      const rows = await this.propertyRepo.listByContactIds([contactId]);
      links = await this.resolveLinks(rows);
    } else {
      const rows = await this.propertyRepo.listByContactIds([contactId]);
      links = await this.resolveLinks(rows);
    }
    audit("contact.updated", {
      contact_id: contact.id,
      changes: Object.keys(data),
      property_count: links.length,
      updated_by: data.updated_by ?? undefined,
    });
    return { contact, links };
  }

  async delete(contactId: string): Promise<void> {
    requireRole(this.opts.actor ?? null, "manager", "delete", "contact");
    requireUuid(contactId, "contact_id");
    const existing = await this.repo.getById(contactId);
    if (!existing) throw new NotFoundError("CONTACT_NOT_FOUND", "Contact not found.");
    await this.repo.softDelete(contactId);
    await this.propertyRepo.deleteByContactId(contactId);
    audit("contact.deleted", {
      contact_id: contactId,
      full_name: existing.full_name,
      deleted_by: this.opts.actor?.id ?? null,
    });
  }

  /** Validate + dedupe property links, ensuring each referenced asset exists. */
  private async validateAndDedupeLinks(
    links: Array<{ asset_id: string; role: string }>,
  ): Promise<ContactPropertyLink[]> {
    const seen = new Set<string>();
    const out: ContactPropertyLink[] = [];
    for (const link of links) {
      requireUuid(link.asset_id, "asset_id");
      const role = normalizeRole(link.role);
      const key = `${link.asset_id}:${role}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ asset_id: link.asset_id, role, asset_name: "", project_id: "" });
    }
    if (out.length > 0) {
      const assetIds = [...new Set(out.map((l) => l.asset_id))];
      const { data, error } = await this.client
        .from("assets")
        .select("id")
        .in("id", assetIds)
        .is("deleted_at", null);
      if (error) throw toDatabaseError(error);
      const found = new Set((data ?? []).map((a) => a.id));
      const missing = assetIds.filter((id) => !found.has(id));
      if (missing.length > 0) {
        throw new ValidationAppError("One or more selected properties do not exist.", [
          { field: "properties", message: "One or more selected properties do not exist." },
        ]);
      }
    }
    return out;
  }

  /** Enrich join rows with the asset name + project id for display. */
  private async resolveLinks(rows: PropertyContactRow[]): Promise<ContactLink[]> {
    if (rows.length === 0) return [];
    const assetIds = [...new Set(rows.map((r) => r.asset_id))];
    const { data, error } = await this.client
      .from("assets")
      .select("id, name, project_id")
      .in("id", assetIds)
      .is("deleted_at", null);
    if (error) throw toDatabaseError(error);
    const byId = new Map((data ?? []).map((a) => [a.id, a]));
    return rows.map((r) => {
      const asset = byId.get(r.asset_id);
      return {
        contact_id: r.contact_id,
        asset_id: r.asset_id,
        asset_name: asset?.name ?? "—",
        project_id: asset?.project_id ?? "",
        role: r.role,
      };
    });
  }
}