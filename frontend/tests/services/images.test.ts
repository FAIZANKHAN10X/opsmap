import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { PNG, imageSaves } = vi.hoisted(() => ({
  PNG: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  ),
  imageSaves: [] as Array<{ path: string; contentType: string }>,
}));

vi.mock("@/lib/server/storage", () => ({
  SupabaseStorage: class {
    async read(path: string) {
      if (path === "assets/a1/documents/d1_orig.png") return PNG;
      throw new Error("not found");
    }
    async save(path: string, data: Uint8Array, contentType: string) {
      imageSaves.push({ path, contentType });
      return data.length;
    }
  },
}));

import { createFakeClient } from "../helpers/fakeClient";
import { processDocumentImage } from "@/lib/server/services/images";

function makeClient(rows: Array<Record<string, unknown>>) {
  return createFakeClient({ documents: rows });
}

function docRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "d1",
    asset_id: "a1",
    name: "photo",
    filename: "photo.png",
    mime_type: "image/png",
    storage_path: "assets/a1/documents/d1_orig.png",
    thumbnail_path: null,
    resized_path: null,
    deleted_at: null,
    ...overrides,
  };
}

describe("processDocumentImage (synchronous)", () => {
  it("generates resized and thumbnail derivatives synchronously", async () => {
    imageSaves.length = 0;
    const client = makeClient([docRow()]);
    const result = await processDocumentImage(client, "d1");

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.thumbnail_path).toBe("assets/a1/documents/derivatives/d1_thumb.png");
    expect(result.resized_path).toBe("assets/a1/documents/derivatives/d1_resized.png");

    expect(imageSaves).toHaveLength(2);
    expect(imageSaves.map((s) => s.path).sort()).toEqual([
      "assets/a1/documents/derivatives/d1_resized.png",
      "assets/a1/documents/derivatives/d1_thumb.png",
    ]);
    expect(imageSaves.every((s) => s.contentType === "image/png")).toBe(true);

    const { data } = await client.from("documents").select("*").eq("id", "d1");
    const row = (data as Array<Record<string, unknown>>)[0];
    expect(row.thumbnail_path).toBe("assets/a1/documents/derivatives/d1_thumb.png");
    expect(row.resized_path).toBe("assets/a1/documents/derivatives/d1_resized.png");
  });

  it("skips missing documents", async () => {
    const client = makeClient([]);
    expect(await processDocumentImage(client, "nope")).toEqual({
      status: "skipped",
      reason: "document_not_found",
    });
  });

  it("skips non-processable images", async () => {
    const client = makeClient([docRow({ mime_type: "application/pdf" })]);
    expect(await processDocumentImage(client, "d1")).toEqual({
      status: "skipped",
      reason: "not_processable_image",
    });
  });

  it("skips documents without a stored file", async () => {
    const client = makeClient([docRow({ storage_path: null })]);
    expect(await processDocumentImage(client, "d1")).toEqual({
      status: "skipped",
      reason: "no_storage_path",
    });
  });

  it("fails when the original file is missing from storage", async () => {
    const client = makeClient([docRow({ storage_path: "assets/a1/documents/missing.png" })]);
    expect(await processDocumentImage(client, "d1")).toEqual({
      status: "failed",
      reason: "file_missing",
    });
  });
});