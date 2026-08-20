import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({
  isSupabaseConfigured: () => true,
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const { ctx } = vi.hoisted(() => ({
  ctx: { client: null as unknown, admin: null as unknown },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ctx.client,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ctx.admin,
}));

import { revalidatePath } from "next/cache";

import { createFakeClientFromStore, createSharedStore } from "../helpers/fakeClient";
import { TEST_USER_ID, adminAuthUser, adminProfile } from "../helpers/auth";
import {
  createContact,
  deleteContact,
  getContact,
  listAssetContacts,
  listContacts,
  updateContact,
} from "@/actions/contacts";
import { DEMO_CONTACTS } from "@/lib/demo/dataset";
import type { UserRole } from "@/types/domain";

const CONTACT_ID = "123e4567-e89b-12d3-a456-426614174010";
const ASSET_ID = "123e4567-e89b-12d3-a456-426614174001";

const CONTACT = {
  id: CONTACT_ID,
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

function makeContext(tables: Record<string, unknown[]>) {
  const store = createSharedStore({
    ...tables,
    profiles: [...(tables.profiles ?? []), adminProfile],
  } as never);
  ctx.client = createFakeClientFromStore(store, { user: adminAuthUser });
  ctx.admin = createFakeClientFromStore(store, { user: adminAuthUser });
  return store;
}

function makeRoleContext(role: UserRole) {
  const store = createSharedStore({
    profiles: [
      {
        id: TEST_USER_ID,
        email: "user@opsmap.app",
        full_name: null,
        role,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ],
    assets: [{ id: ASSET_ID, name: "Villa Melasti", project_id: "proj-1", deleted_at: null }],
    contacts: [CONTACT],
  } as never);
  const user = { id: TEST_USER_ID, email: "user@opsmap.app", user_metadata: {} };
  ctx.client = createFakeClientFromStore(store, { user });
  ctx.admin = createFakeClientFromStore(store, { user });
  return store;
}

describe("contact actions", () => {
  beforeEach(() => {
    vi.mocked(revalidatePath).mockClear();
  });

  it("createContact returns a success envelope with the mapped contact", async () => {
    makeContext({
      assets: [{ id: ASSET_ID, name: "Villa Melasti", project_id: "proj-1", deleted_at: null }],
      contacts: [],
    });
    const res = await createContact({
      full_name: "Made Wijaya",
      type: "owner",
      properties: [{ asset_id: ASSET_ID, role: "owner" }],
    });
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.full_name).toBe("Made Wijaya");
    expect(res.data.type).toBe("owner");
    expect(res.data.properties).toHaveLength(1);
    expect(res.data.properties[0].asset_name).toBe("Villa Melasti");
  });

  it("createContact maps validation failures to the error envelope", async () => {
    makeContext({ assets: [], contacts: [] });
    const res = await createContact({ full_name: "", type: "owner" });
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error.code).toBe("VALIDATION_ERROR");
    expect(res.error.fields).toBeDefined();
  });

  it("updateContact persists changes and revalidates contact routes", async () => {
    makeContext({ assets: [], contacts: [CONTACT] });
    const res = await updateContact(CONTACT_ID, { company: "Wijaya Estates" });
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.company).toBe("Wijaya Estates");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/contacts");
  });

  it("deleteContact resolves with null data and revalidates on success", async () => {
    makeContext({ contacts: [CONTACT] });
    const res = await deleteContact(CONTACT_ID);
    expect(res).toEqual({ success: true, data: null, message: null });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/contacts");
  });

  it("deleteContact maps missing contacts to the error envelope", async () => {
    makeContext({ contacts: [] });
    const res = await deleteContact(CONTACT_ID);
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error.code).toBe("CONTACT_NOT_FOUND");
  });

  it("failed createContact does not revalidate routes", async () => {
    makeContext({ assets: [], contacts: [] });
    const res = await createContact({ full_name: "", type: "owner" });
    expect(res.success).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("listContacts paginates and reports totals", async () => {
    makeContext({
      contacts: [
        CONTACT,
        { ...CONTACT, id: "123e4567-e89b-12d3-a456-426614174011", full_name: "Ayu", type: "assignee" },
      ],
    });
    const res = await listContacts({ page: 1, limit: 1 });
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data).toHaveLength(1);
    expect(res.pagination.total).toBe(2);
  });

  it("viewers and operators are forbidden from deleting contacts", async () => {
    for (const role of ["viewer", "operator"] as const) {
      makeRoleContext(role);
      const res = await deleteContact(CONTACT_ID);
      expect(res.success).toBe(false);
      if (res.success) return;
      expect(res.error.code).toBe("FORBIDDEN");
      expect(revalidatePath).not.toHaveBeenCalled();
    }
  });

  it("viewers are forbidden from creating or updating contacts", async () => {
    makeRoleContext("viewer");
    const created = await createContact({ full_name: "Jane", type: "lead" });
    expect(created.success).toBe(false);
    if (created.success) return;
    expect(created.error.code).toBe("FORBIDDEN");

    const updated = await updateContact(CONTACT_ID, { company: "Co" });
    expect(updated.success).toBe(false);
    if (updated.success) return;
    expect(updated.error.code).toBe("FORBIDDEN");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("operators can create and update contacts", async () => {
    makeRoleContext("operator");
    const created = await createContact({ full_name: "Jane", type: "lead" });
    expect(created.success).toBe(true);

    makeRoleContext("operator");
    const updated = await updateContact(CONTACT_ID, { company: "Co" });
    expect(updated.success).toBe(true);
  });

  it("managers can delete contacts", async () => {
    makeRoleContext("manager");
    const res = await deleteContact(CONTACT_ID);
    expect(res.success).toBe(true);
  });
});

describe("contact actions in demo mode", () => {
  it("listContacts returns demo contacts with resolved links", async () => {
    const res = await listContacts({ page: 1, limit: 100 }, true);
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.length).toBeGreaterThan(0);
    const first = res.data[0];
    expect(first.full_name.length).toBeGreaterThan(0);
    expect(first.properties.length).toBeGreaterThan(0);
    expect(first.properties[0].asset_name.length).toBeGreaterThan(0);
  });

  it("listContacts respects the demo type filter", async () => {
    const res = await listContacts({ page: 1, limit: 100, type: "owner" }, true);
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.every((c) => c.type === "owner")).toBe(true);
  });

  it("getContact returns a demo contact by id", async () => {
    const res = await getContact(DEMO_CONTACTS[0].id, true);
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.id).toBe(DEMO_CONTACTS[0].id);
  });

  it("getContact maps missing demo contacts to the error envelope", async () => {
    const res = await getContact("123e4567-e89b-12d3-a456-426614174999", true);
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error.code).toBe("CONTACT_NOT_FOUND");
  });

  it("listAssetContacts returns demo contacts for an asset", async () => {
    const demoAsset = DEMO_CONTACTS[0].links[0];
    const res = await listAssetContacts(demoAsset.assetId, true);
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data[0].asset_id).toBe(demoAsset.assetId);
    expect(res.data[0].contact.full_name.length).toBeGreaterThan(0);
  });
});