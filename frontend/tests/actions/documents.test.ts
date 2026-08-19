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

const { storageCalls } = vi.hoisted(() => ({
  storageCalls: { save: [] as unknown[] },
}));

vi.mock("@/lib/server/storage", () => ({
  SupabaseStorage: class {
    buildRelativePath() {
      return "assets/a1/documents/d1_report.pdf";
    }
    async save(path: string, data: unknown) {
      storageCalls.save.push([path, data]);
      return 12345;
    }
    async delete(path: string | null) {
      return path;
    }
  },
}));

vi.mock("@/lib/server/services/images", () => ({
  processDocumentImage: vi.fn(() => Promise.resolve({ status: "skipped" })),
}));

import { createFakeClientFromStore, createSharedStore } from "../helpers/fakeClient";
import { TEST_USER_ID, adminAuthUser, adminProfile } from "../helpers/auth";
import {
  createDocument,
  deleteDocument,
  listDocumentsForAsset,
  uploadDocument,
} from "@/actions/documents";
import type { UserRole } from "@/types/domain";
import { revalidatePath } from "next/cache";

const ASSET = "123e4567-e89b-12d3-a456-426614174000";

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
    assets: [{ id: ASSET, name: "Laptop 1", deleted_at: null }],
    documents: [],
  } as never);
  const user = { id: TEST_USER_ID, email: "user@opsmap.app", user_metadata: {} };
  ctx.client = createFakeClientFromStore(store, { user });
  ctx.admin = createFakeClientFromStore(store, { user });
  return store;
}

const BASE = {
  assets: [{ id: ASSET, name: "Laptop 1", deleted_at: null }],
  documents: [],
};

describe("document actions", () => {
  beforeEach(() => {
    vi.mocked(revalidatePath).mockClear();
  });

  it("uploadDocument accepts multipart form data and returns a success envelope", async () => {
    makeContext(BASE);
    const form = new FormData();
    form.append("asset_id", ASSET);
    form.append("name", "Purchase agreement");
    form.append("category", "contract");
    form.append("file", new File(["%PDF-1.4 content"], "agreement.pdf", { type: "application/pdf" }));

    const res = await uploadDocument(form);
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.filename).toBe("agreement.pdf");
    expect(res.data.category).toBe("contract");
    expect(res.data.name).toBe("Purchase agreement");
    expect(res.data.size_bytes).toBe(12345);
    expect(res.data.is_previewable).toBe(true);
    expect(res.data.has_file).toBe(true);
    expect(storageCalls.save.length).toBe(1);
  });

  it("uploadDocument requires asset_id and file", async () => {
    makeContext(BASE);
    const res = await uploadDocument(new FormData());
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error.code).toBe("INTERNAL_ERROR");
  });

  it("createDocument persists metadata without a binary", async () => {
    makeContext(BASE);
    const res = await createDocument({
      asset_id: ASSET,
      name: "Floor plan",
      filename: "floor-plan.pdf",
      mime_type: "application/pdf",
      size_bytes: 12000,
      category: "drawing",
    });
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.name).toBe("Floor plan");
    expect(res.data.has_file).toBe(false);
    expect(res.data.is_previewable).toBe(false);
  });

  it("createDocument maps missing asset to the error envelope", async () => {
    makeContext({ assets: [], documents: [] });
    const res = await createDocument({ asset_id: ASSET, name: "D", filename: "d.pdf" });
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error.code).toBe("ASSET_NOT_FOUND");
  });

  it("listDocumentsForAsset paginates and reports totals", async () => {
    const docs = [
      { id: "d1", asset_id: ASSET, name: "A", filename: "a.pdf", category: "other", deleted_at: null },
      { id: "d2", asset_id: ASSET, name: "B", filename: "b.pdf", category: "other", deleted_at: null },
    ];
    makeContext({ assets: BASE.assets, documents: docs });
    const res = await listDocumentsForAsset(ASSET, { page: 1, limit: 1 });
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data).toHaveLength(1);
    expect(res.pagination.total).toBe(2);
  });

  it("deleteDocument resolves with null data", async () => {
    makeContext({
      assets: BASE.assets,
      documents: [{ id: "d1", asset_id: ASSET, name: "A", filename: "a.pdf", category: "other", deleted_at: null }],
    });
    const res = await deleteDocument("d1");
    expect(res).toEqual({ success: true, data: null, message: null });
  });

  it("uploadDocument revalidates the document routes on success", async () => {
    makeContext(BASE);
    const form = new FormData();
    form.append("asset_id", ASSET);
    form.append("file", new File(["content"], "a.pdf", { type: "application/pdf" }));
    const res = await uploadDocument(form);
    expect(res.success).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/properties/[id]");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/development");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/database");
  });

  it("failed uploadDocument does not revalidate routes", async () => {
    makeContext(BASE);
    const res = await uploadDocument(new FormData());
    expect(res.success).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("deleteDocument revalidates the document routes on success", async () => {
    makeContext({
      assets: BASE.assets,
      documents: [{ id: "d1", asset_id: ASSET, name: "A", filename: "a.pdf", category: "other", deleted_at: null }],
    });
    const res = await deleteDocument("d1");
    expect(res.success).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/properties/[id]");
  });

  it("viewers cannot upload or delete documents", async () => {
    makeRoleContext("viewer");
    const form = new FormData();
    form.append("asset_id", ASSET);
    form.append("file", new File(["content"], "a.pdf", { type: "application/pdf" }));
    const uploaded = await uploadDocument(form);
    expect(uploaded.success).toBe(false);
    if (uploaded.success) return;
    expect(uploaded.error.code).toBe("FORBIDDEN");
    expect((await deleteDocument("d1")).success).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("operators can upload but not delete documents", async () => {
    makeRoleContext("operator");
    const form = new FormData();
    form.append("asset_id", ASSET);
    form.append("file", new File(["content"], "a.pdf", { type: "application/pdf" }));
    const uploaded = await uploadDocument(form);
    expect(uploaded.success).toBe(true);

    const deleted = await deleteDocument("some-doc");
    expect(deleted.success).toBe(false);
    if (deleted.success) return;
    expect(deleted.error.code).toBe("FORBIDDEN");
  });
});