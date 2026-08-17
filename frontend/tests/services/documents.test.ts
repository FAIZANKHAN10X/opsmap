import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { storageCalls } = vi.hoisted(() => ({
  storageCalls: {
    save: [] as unknown[],
    read: [] as unknown[],
    delete: [] as unknown[],
  },
}));

vi.mock("@/lib/server/storage", () => ({
  SupabaseStorage: class {
    buildRelativePath() {
      return "assets/a1/documents/d1_report";
    }
    async save(path: string, data: unknown) {
      storageCalls.save.push([path, data]);
      return 12345;
    }
    async read(path: string) {
      storageCalls.read.push(path);
      if (path === "missing.bin") throw new Error("not found");
      return new Uint8Array();
    }
    async delete(path: string | null) {
      storageCalls.delete.push(path);
    }
  },
  ReportStorage: class {
    async save() {
      return 1;
    }
  },
}));

vi.mock("@/lib/server/services/images", () => ({
  processDocumentImage: vi.fn(() => Promise.resolve({ status: "skipped" })),
}));

import { createFakeClient } from "../helpers/fakeClient";
import { DocumentService } from "@/lib/server/services/documents";
import { NotFoundError, ValidationAppError } from "@/lib/server/errors";

const ASSET = "123e4567-e89b-12d3-a456-426614174000";

function makeService() {
  const client = createFakeClient({
    assets: [{ id: ASSET, name: "Laptop 1", deleted_at: null }],
    documents: [],
  });
  const service = new DocumentService(client);
  return { client, service };
}

function makeServiceWithDocs(
  docs: Array<{
    id: string;
    name: string;
    filename: string;
    category: string;
    notes?: string | null;
    mime_type?: string | null;
    created_at?: string;
  }>,
) {
  const client = createFakeClient({
    assets: [{ id: ASSET, name: "Laptop 1", deleted_at: null }],
    documents: docs.map((d) => ({
      asset_id: ASSET,
      storage_path: null,
      thumbnail_path: null,
      resized_path: null,
      size_bytes: 10,
      deleted_at: null,
      created_at: d.created_at ?? "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      ...d,
    })),
  });
  const service = new DocumentService(client);
  return { client, service };
}

beforeEach(() => {
  vi.clearAllMocks();
  storageCalls.save.length = 0;
  storageCalls.read.length = 0;
  storageCalls.delete.length = 0;
});

describe("DocumentService", () => {
  it("returns DOCUMENT_NOT_FOUND for missing documents", async () => {
    const { service } = makeService();
    await expect(service.get("99999999-0000-0000-0000-000000000000")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("rejects uploads to a missing asset", async () => {
    const { service } = makeService();
    await expect(
      service.upload({
        asset_id: "99999999-0000-0000-0000-000000000000",
        filename: "x.pdf",
        data: new Uint8Array([1]),
      }),
    ).rejects.toMatchObject({ code: "ASSET_NOT_FOUND" });
  });

  it("rejects empty files", async () => {
    const { service } = makeService();
    const err = await service
      .upload({ asset_id: ASSET, filename: "x.pdf", data: new Uint8Array(0) })
      .catch((e) => e);
    expect(err).toBeInstanceOf(ValidationAppError);
    expect(err.message).toBe("Empty file.");
  });

  it("rejects oversized files", async () => {
    const { service } = makeService();
    const err = await service
      .upload({ asset_id: ASSET, filename: "x.pdf", data: new Uint8Array(11 * 1024 * 1024) })
      .catch((e) => e);
    expect(err).toBeInstanceOf(ValidationAppError);
    expect(err.message).toContain("exceeds maximum size");
  });

  it("rejects disallowed mime types", async () => {
    const { service } = makeService();
    const err = await service
      .upload({
        asset_id: ASSET,
        filename: "x.exe",
        content_type: "application/x-msdownload",
        data: new Uint8Array([1]),
      })
      .catch((e) => e);
    expect(err).toBeInstanceOf(ValidationAppError);
    expect(err.message).toBe("File type is not allowed.");
  });

  it("rejects unknown categories", async () => {
    const { service } = makeService();
    const err = await service
      .upload({
        asset_id: ASSET,
        filename: "x.pdf",
        content_type: "application/pdf",
        category: "misc",
        data: new Uint8Array([1]),
      })
      .catch((e) => e);
    expect(err).toBeInstanceOf(ValidationAppError);
    expect(err.message).toBe("Invalid category.");
  });

  it("stores a valid upload with inferred name and category", async () => {
    const { client, service } = makeService();
    const doc = await service.upload({
      asset_id: ASSET,
      filename: "invoice.pdf",
      content_type: "application/pdf",
      data: new Uint8Array([1, 2, 3]),
    });
    expect(doc.name).toBe("invoice");
    expect(doc.category).toBe("report");
    expect(doc.mime_type).toBe("application/pdf");
    expect(doc.size_bytes).toBe(12345);

    const { data } = await client.from("documents").select("*");
    expect(data).toHaveLength(1);
  });

  it("honors an explicit display name and category", async () => {
    const { service } = makeService();
    const doc = await service.upload({
      asset_id: ASSET,
      filename: "photo.png",
      content_type: "image/png",
      name: "   Office photo  ",
      category: "image",
      data: new Uint8Array([1]),
    });
    expect(doc.name).toBe("Office photo");
    expect(doc.category).toBe("image");
  });

  it("rejects invalid category on update", async () => {
    const { client, service } = makeService();
    const doc = await service.upload({
      asset_id: ASSET,
      filename: "a.pdf",
      content_type: "application/pdf",
      data: new Uint8Array([1]),
    });
    const err = await service.update(doc.id, { category: "nope" }).catch((e) => e);
    expect(err).toBeInstanceOf(ValidationAppError);
    expect(err.fields[0].field).toBe("category");
    void client;
  });

  it("soft deletes documents", async () => {
    const { service } = makeService();
    const doc = await service.upload({
      asset_id: ASSET,
      filename: "a.pdf",
      content_type: "application/pdf",
      data: new Uint8Array([1]),
    });
    await service.delete(doc.id);
    await expect(service.get(doc.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("infers the other category when no mime hint exists", async () => {
    const { service } = makeService();
    const doc = await service.upload({
      asset_id: ASSET,
      filename: "notes.txt",
      content_type: "text/plain",
      data: new Uint8Array([1]),
    });
    expect(doc.category).toBe("other");
  });

  it("reads a stored file for preview and download", async () => {
    const { service } = makeService();
    const doc = await service.upload({
      asset_id: ASSET,
      filename: "photo.png",
      content_type: "image/png",
      data: new Uint8Array([1, 2, 3]),
    });
    const { document, data } = await service.readFile(doc.id);
    expect(document.id).toBe(doc.id);
    expect(data).toBeInstanceOf(Uint8Array);
  });

  it("throws FILE_NOT_FOUND for metadata-only rows with no stored file", async () => {
    const { service } = makeService();
    const doc = await service.create({
      asset_id: ASSET,
      name: "Manual",
      filename: "manual.pdf",
    });
    const err = await service.readFile(doc.id).catch((e) => e);
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err.code).toBe("FILE_NOT_FOUND");
  });

  it("throws FILE_NOT_FOUND when the stored file is missing from storage", async () => {
    const { client, service } = makeService();
    const doc = await service.upload({
      asset_id: ASSET,
      filename: "a.pdf",
      content_type: "application/pdf",
      data: new Uint8Array([1]),
    });
    await client.from("documents").update({ storage_path: "missing.bin" }).eq("id", doc.id);
    const err = await service.readFile(doc.id).catch((e) => e);
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err.code).toBe("FILE_NOT_FOUND");
  });

  it("rejects unknown category on listForAsset", async () => {
    const { service } = makeService();
    const err = await service
      .listForAsset(ASSET, { page: 1, limit: 25, category: "nope" })
      .catch((e) => e);
    expect(err).toBeInstanceOf(ValidationAppError);
    expect(err.message).toBe("Invalid category.");
  });

  it("lists documents filtered by category", async () => {
    const { service } = makeServiceWithDocs([
      { id: "a", name: "Invoice", filename: "inv.pdf", category: "report", mime_type: "application/pdf" },
      { id: "b", name: "Spec", filename: "spec.pdf", category: "manual", mime_type: "application/pdf" },
    ]);
    const { items, total } = await service.listAll({ page: 1, limit: 25, category: "report" });
    expect(total).toBe(1);
    expect(items[0].id).toBe("a");
  });

  it("lists documents matching a search term across name, filename and notes", async () => {
    const { service } = makeServiceWithDocs([
      { id: "a", name: "Invoice", filename: "inv.pdf", category: "report", mime_type: "application/pdf" },
      { id: "b", name: "Spec", filename: "spec.pdf", category: "manual", mime_type: "application/pdf" },
      { id: "c", name: "Other", filename: "o.txt", category: "other", notes: "mentions warranty", mime_type: "text/plain" },
    ]);
    const byName = await service.listAll({ page: 1, limit: 25, search: "spec" });
    expect(byName.total).toBe(1);
    expect(byName.items[0].id).toBe("b");

    const byNotes = await service.listAll({ page: 1, limit: 25, search: "warranty" });
    expect(byNotes.total).toBe(1);
    expect(byNotes.items[0].id).toBe("c");
  });

  it("paginates document listings and keeps the full count", async () => {
    const { service } = makeServiceWithDocs([
      { id: "a", name: "A", filename: "a.pdf", category: "report", created_at: "2026-01-03T00:00:00Z" },
      { id: "b", name: "B", filename: "b.pdf", category: "report", created_at: "2026-01-02T00:00:00Z" },
      { id: "c", name: "C", filename: "c.pdf", category: "report", created_at: "2026-01-01T00:00:00Z" },
    ]);
    const { items, total } = await service.listAll({ page: 1, limit: 2 });
    expect(total).toBe(3);
    expect(items).toHaveLength(2);
    expect(items.map((d) => d.id)).toEqual(["a", "b"]);
  });

  it("removes all stored binaries when deleting a document", async () => {
    const { client, service } = makeService();
    const doc = await service.upload({
      asset_id: ASSET,
      filename: "photo.png",
      content_type: "image/png",
      data: new Uint8Array([1]),
    });
    await client
      .from("documents")
      .update({
        thumbnail_path: "assets/a1/derivatives/d1_thumb.jpg",
        resized_path: "assets/a1/derivatives/d1_resized.jpg",
      })
      .eq("id", doc.id);
    storageCalls.delete.length = 0;

    await service.delete(doc.id);

    expect(storageCalls.delete).toEqual([
      "assets/a1/documents/d1_report",
      "assets/a1/derivatives/d1_thumb.jpg",
      "assets/a1/derivatives/d1_resized.jpg",
    ]);
  });
});