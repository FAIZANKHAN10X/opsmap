import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/env", () => ({
  isSupabaseConfigured: vi.fn(() => true),
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

const { storageState } = vi.hoisted(() => ({
  storageState: {
    read: vi.fn(async (path?: string | null) => {
      void path;
      return new Uint8Array([1, 2, 3]);
    }),
    delete: vi.fn(async (path?: string | null) => {
      void path;
      return undefined;
    }),
  },
}));

vi.mock("@/lib/server/storage", () => ({
  SupabaseStorage: class {
    buildRelativePath() {
      return "assets/a1/documents/d1_report.pdf";
    }
    async save() {
      return 3;
    }
    read(path: string | null) {
      return storageState.read(path);
    }
    delete(path: string | null) {
      return storageState.delete(path);
    }
  },
}));

vi.mock("@/lib/server/services/images", () => ({
  processDocumentImage: vi.fn(() => Promise.resolve({ status: "skipped" })),
}));

import { createFakeClientFromStore, createSharedStore } from "../helpers/fakeClient";
import { GET as downloadGET, POST as downloadPOST } from "@/app/api/documents/[id]/download/route";
import { GET as previewGET, POST as previewPOST } from "@/app/api/documents/[id]/preview/route";
import { GET as thumbnailGET, POST as thumbnailPOST } from "@/app/api/documents/[id]/thumbnail/route";
import { isSupabaseConfigured } from "@/lib/env";

const ASSET = "123e4567-e89b-12d3-a456-426614174000";
const DOC = "223e4567-e89b-12d3-a456-426614174001";

function docRow(overrides: Record<string, unknown> = {}) {
  return {
    id: DOC,
    asset_id: ASSET,
    name: "Agreement",
    filename: "agreement.pdf",
    mime_type: "application/pdf",
    size_bytes: 3,
    storage_path: "assets/a1/documents/d1_agreement.pdf",
    thumbnail_path: null,
    resized_path: null,
    category: "contract",
    notes: null,
    deleted_at: null,
    ...overrides,
  };
}

function makeContext(documents: Record<string, unknown>[]) {
  const store = createSharedStore({
    assets: [{ id: ASSET, deleted_at: null }],
    documents,
  } as never);
  ctx.client = createFakeClientFromStore(store);
  ctx.admin = createFakeClientFromStore(store);
}

const mockedConfigured = vi.mocked(isSupabaseConfigured);

afterEach(() => {
  vi.clearAllMocks();
  mockedConfigured.mockReturnValue(true);
});

describe("GET /api/documents/[id]/download", () => {
  it("serves the stored file as an attachment", async () => {
    makeContext([docRow()]);
    const res = await downloadGET(new Request("http://localhost/api/documents/x/download"), { params: Promise.resolve({ id: DOC }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toContain("attachment");
    expect(res.headers.get("content-length")).toBe("3");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("rejects malformed ids with a 422", async () => {
    makeContext([docRow()]);
    const res = await downloadGET(new Request("http://localhost/"), { params: Promise.resolve({ id: "nope" }) });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 for missing documents", async () => {
    makeContext([]);
    const res = await downloadGET(new Request("http://localhost/"), { params: Promise.resolve({ id: DOC }) });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("DOCUMENT_NOT_FOUND");
  });

  it("returns 503 when Supabase is not configured", async () => {
    mockedConfigured.mockReturnValue(false);
    makeContext([docRow()]);
    const res = await downloadGET(new Request("http://localhost/"), { params: Promise.resolve({ id: DOC }) });
    expect(res.status).toBe(503);
  });

  it("rejects POST with 405", async () => {
    const res = await downloadPOST();
    expect(res.status).toBe(405);
  });
});

describe("GET /api/documents/[id]/preview", () => {
  it("serves the stored file inline", async () => {
    makeContext([docRow()]);
    const res = await previewGET(new Request("http://localhost/"), { params: Promise.resolve({ id: DOC }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain("inline");
  });

  it("rejects POST with 405", async () => {
    const res = await previewPOST();
    expect(res.status).toBe(405);
  });
});

describe("GET /api/documents/[id]/thumbnail", () => {
  it("serves the generated thumbnail with caching headers", async () => {
    makeContext([docRow({ thumbnail_path: "assets/a1/documents/d1_thumb.png" })]);
    const res = await thumbnailGET(new Request("http://localhost/"), { params: Promise.resolve({ id: DOC }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toBe("public, max-age=86400");
    expect(res.headers.get("content-disposition")).toBe('inline; filename="thumbnail"');
  });

  it("returns 404 when no thumbnail has been generated", async () => {
    makeContext([docRow()]);
    const res = await thumbnailGET(new Request("http://localhost/"), { params: Promise.resolve({ id: DOC }) });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("THUMBNAIL_NOT_FOUND");
  });

  it("returns 404 when the thumbnail file is missing from storage", async () => {
    makeContext([docRow({ thumbnail_path: "assets/a1/documents/d1_thumb.png" })]);
    storageState.read.mockRejectedValueOnce(new Error("missing"));
    const res = await thumbnailGET(new Request("http://localhost/"), { params: Promise.resolve({ id: DOC }) });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("THUMBNAIL_NOT_FOUND");
  });

  it("returns 404 for missing documents", async () => {
    makeContext([]);
    const res = await thumbnailGET(new Request("http://localhost/"), { params: Promise.resolve({ id: DOC }) });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("DOCUMENT_NOT_FOUND");
  });

  it("rejects POST with 405", async () => {
    const res = await thumbnailPOST();
    expect(res.status).toBe(405);
  });
});