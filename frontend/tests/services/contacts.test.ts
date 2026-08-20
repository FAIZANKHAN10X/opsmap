import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createFakeClient } from "../helpers/fakeClient";
import { ContactService } from "@/lib/server/services/contacts";
import { NotFoundError, ValidationAppError } from "@/lib/server/errors";

const ASSET_1 = {
  id: "123e4567-e89b-12d3-a456-426614174001",
  name: "Villa Melasti",
  project_id: "123e4567-e89b-12d3-a456-426614174000",
  deleted_at: null,
};
const ASSET_2 = {
  id: "123e4567-e89b-12d3-a456-426614174002",
  name: "Villa Nyang Nyang",
  project_id: "123e4567-e89b-12d3-a456-426614174000",
  deleted_at: null,
};

const CONTACT = {
  id: "123e4567-e89b-12d3-a456-426614174010",
  type: "owner",
  full_name: "Made Wijaya",
  company: null,
  email: null,
  phone: null,
  whatsapp: null,
  notes: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  created_by: null,
  updated_by: null,
  deleted_at: null,
};

function makeService(rows: {
  assets?: unknown[];
  contacts?: unknown[];
  property_contacts?: unknown[];
} = {}) {
  const client = createFakeClient({
    assets: (rows.assets ?? []).map((r) => ({ ...(r as object) })),
    contacts: (rows.contacts ?? []).map((r) => ({ ...(r as object) })),
    property_contacts: (rows.property_contacts ?? []).map((r) => ({ ...(r as object) })),
  });
  return new ContactService(client);
}

describe("ContactService", () => {
  it("creates a contact with normalized fields and persists property links", async () => {
    const service = makeService({ assets: [ASSET_1, ASSET_2] });
    const { contact, links } = await service.create({
      type: "owner",
      full_name: "  Made Wijaya  ",
      company: "Wijaya Estates",
      email: "made@example.com",
      phone: "+62 812",
      whatsapp: "+62 812",
      notes: "Primary owner",
      properties: [
        { asset_id: ASSET_1.id, role: "owner" },
        { asset_id: ASSET_2.id, role: "owner" },
      ],
    });

    expect(contact.full_name).toBe("Made Wijaya");
    expect(contact.company).toBe("Wijaya Estates");
    expect(contact.type).toBe("owner");
    expect(links).toHaveLength(2);

    const stored = await service.get(contact.id);
    expect(stored.contact.full_name).toBe("Made Wijaya");
    expect(stored.links.map((l) => l.asset_name).sort()).toEqual([
      "Villa Melasti",
      "Villa Nyang Nyang",
    ]);
  });

  it("defaults the type to 'other' and rejects unknown types", async () => {
    const service = makeService();
    const { contact } = await service.create({ full_name: "Jane Doe", type: "" });
    expect(contact.type).toBe("other");
    await expect(
      service.create({ full_name: "Jane Doe", type: "bogus" }),
    ).rejects.toThrow(ValidationAppError);
  });

  it("rejects empty names", async () => {
    const service = makeService();
    await expect(service.create({ full_name: "   ", type: "lead" })).rejects.toThrow(
      ValidationAppError,
    );
  });

  it("rejects links to properties that do not exist", async () => {
    const service = makeService({ assets: [ASSET_1] });
    await expect(
      service.create({
        full_name: "Ghost",
        type: "other",
        properties: [{ asset_id: "123e4567-e89b-12d3-a456-426614174999", role: "owner" }],
      }),
    ).rejects.toThrow(ValidationAppError);
  });

  it("rejects invalid property roles", async () => {
    const service = makeService({ assets: [ASSET_1] });
    await expect(
      service.create({
        full_name: "Jane",
        type: "other",
        properties: [{ asset_id: ASSET_1.id, role: "boss" }],
      }),
    ).rejects.toThrow(ValidationAppError);
  });

  it("dedupes duplicate property links", async () => {
    const service = makeService({ assets: [ASSET_1] });
    const { links } = await service.create({
      full_name: "Jane",
      type: "owner",
      properties: [
        { asset_id: ASSET_1.id, role: "owner" },
        { asset_id: ASSET_1.id, role: "owner" },
      ],
    });
    expect(links).toHaveLength(1);
  });

  it("lists contacts with search, type filter, and resolved property links", async () => {
    const service = makeService({
      assets: [ASSET_1, ASSET_2],
      contacts: [
        CONTACT,
        { ...CONTACT, id: "123e4567-e89b-12d3-a456-426614174011", full_name: "Ayu", type: "assignee" },
      ],
      property_contacts: [
        { id: "p1", asset_id: ASSET_1.id, contact_id: CONTACT.id, role: "owner" },
      ],
    });

    const all = await service.list({ page: 1, limit: 100 });
    expect(all.total).toBe(2);
    expect(all.linksByContactId[CONTACT.id]).toHaveLength(1);
    expect(all.linksByContactId[CONTACT.id][0].asset_name).toBe("Villa Melasti");
    expect(all.linksByContactId[CONTACT.id][0].role).toBe("owner");

    const filtered = await service.list({ page: 1, limit: 100, type: "assignee" });
    expect(filtered.total).toBe(1);
    expect(filtered.items[0].full_name).toBe("Ayu");

    const searched = await service.list({ page: 1, limit: 100, search: "made" });
    expect(searched.items.map((c) => c.full_name)).toEqual(["Made Wijaya"]);
  });

  it("returns not-found for missing contacts", async () => {
    const service = makeService();
    await expect(service.get("123e4567-e89b-12d3-a456-426614174999")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("updates fields and reconciles property links", async () => {
    const service = makeService({
      assets: [ASSET_1, ASSET_2],
      contacts: [CONTACT],
      property_contacts: [{ id: "p1", asset_id: ASSET_1.id, contact_id: CONTACT.id, role: "owner" }],
    });

    const { contact, links } = await service.update(CONTACT.id, {
      company: "New Co",
      type: "client",
      properties: [{ asset_id: ASSET_2.id, role: "agent" }],
    });

    expect(contact.company).toBe("New Co");
    expect(contact.type).toBe("client");
    expect(links).toHaveLength(1);
    expect(links[0].asset_id).toBe(ASSET_2.id);
    expect(links[0].role).toBe("agent");

    const stored = await service.get(CONTACT.id);
    expect(stored.links).toHaveLength(1);
    expect(stored.links[0].asset_name).toBe("Villa Nyang Nyang");
  });

  it("delete soft-deletes the contact and removes its property links", async () => {
    const service = makeService({
      assets: [ASSET_1],
      contacts: [CONTACT],
      property_contacts: [{ id: "p1", asset_id: ASSET_1.id, contact_id: CONTACT.id, role: "owner" }],
    });

    await service.delete(CONTACT.id);
    await expect(service.get(CONTACT.id)).rejects.toThrow(NotFoundError);
    const byAsset = await service.listByAssetId(ASSET_1.id);
    expect(byAsset).toHaveLength(0);
  });

  it("lists contacts for a property with their roles", async () => {
    const service = makeService({
      assets: [ASSET_1],
      contacts: [CONTACT],
      property_contacts: [{ id: "p1", asset_id: ASSET_1.id, contact_id: CONTACT.id, role: "owner" }],
    });

    const rows = await service.listByAssetId(ASSET_1.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].contact.full_name).toBe("Made Wijaya");
    expect(rows[0].link.role).toBe("owner");
  });

  it("excludes soft-deleted contacts from property lookups", async () => {
    const service = makeService({
      assets: [ASSET_1],
      contacts: [{ ...CONTACT, deleted_at: "2026-02-01T00:00:00Z" }],
      property_contacts: [{ id: "p1", asset_id: ASSET_1.id, contact_id: CONTACT.id, role: "owner" }],
    });
    const rows = await service.listByAssetId(ASSET_1.id);
    expect(rows).toHaveLength(0);
  });
});