import { describe, expect, it } from "vitest";

import {
  toAsset,
  toAssetStatus,
  toAssetType,
  toDocument,
  toNotification,
  toProject,
} from "@/lib/server/mappers";

describe("toProject", () => {
  it("defaults status to active when missing", () => {
    const row = {
      id: "p1",
      name: "Main",
      slug: "main",
      description: null,
      status: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    } as never;
    expect(toProject(row).status).toBe("active");
  });

  it("keeps the stored status", () => {
    const row = {
      id: "p1",
      name: "Main",
      slug: "main",
      description: null,
      status: "archived",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    } as never;
    expect(toProject(row).status).toBe("archived");
  });
});

describe("toDocument", () => {
  function row(overrides: Record<string, unknown> = {}) {
    return {
      id: "d1",
      asset_id: "a1",
      name: "Report",
      filename: "report.pdf",
      mime_type: "application/pdf",
      size_bytes: 10,
      storage_path: "assets/a1/documents/d1_report.pdf",
      thumbnail_path: null,
      resized_path: null,
      category: "report",
      notes: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      ...overrides,
    } as never;
  }

  it("marks stored previewable mime types as previewable", () => {
    expect(toDocument(row()).is_previewable).toBe(true);
  });

  it("is not previewable for non-previewable mime types even with a file", () => {
    const doc = toDocument(row({ mime_type: "application/octet-stream" }));
    expect(doc.is_previewable).toBe(false);
    expect(doc.has_file).toBe(true);
  });

  it("is not previewable without a stored file", () => {
    const doc = toDocument(row({ storage_path: null, mime_type: "image/png" }));
    expect(doc.is_previewable).toBe(false);
    expect(doc.has_file).toBe(false);
  });

  it("falls back to 'other' category when null", () => {
    expect(toDocument(row({ category: null })).category).toBe("other");
  });

  it("sets has_thumbnail from thumbnail_path", () => {
    expect(toDocument(row({ thumbnail_path: "thumb.jpg" })).has_thumbnail).toBe(true);
    expect(toDocument(row()).has_thumbnail).toBe(false);
  });
});

describe("toNotification", () => {
  it("derives is_read from read_at", () => {
    const base = {
      id: "n1",
      severity: "info",
      kind: "assignment",
      title: "T",
      message: "M",
      recipient: "Alex",
      recipient_email: null,
      entity_type: "asset",
      entity_id: "a1",
      read_at: null,
      metadata: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    expect(toNotification(base as never).is_read).toBe(false);
    expect(toNotification({ ...base, read_at: "2026-01-02T00:00:00Z" } as never).is_read).toBe(true);
  });
});

describe("toAssetType", () => {
  it("passes through shape fields unchanged", () => {
    const row = {
      id: "t1",
      name: "Villa",
      slug: "villa",
      description: "Whole units",
      sort_order: 2,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    } as never;
    expect(toAssetType(row)).toEqual({
      id: "t1",
      name: "Villa",
      slug: "villa",
      description: "Whole units",
      sort_order: 2,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    });
  });
});

describe("toAssetStatus", () => {
  it("passes through color and sort_order", () => {
    const row = {
      id: "s1",
      name: "Available",
      slug: "available",
      description: null,
      color: "#22c55e",
      sort_order: 1,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    } as never;
    const status = toAssetStatus(row);
    expect(status.color).toBe("#22c55e");
    expect(status.sort_order).toBe(1);
    expect(status.slug).toBe("available");
  });
});

describe("toAsset", () => {
  function row(overrides: Record<string, unknown> = {}) {
    return {
      id: "a1",
      project_id: "p1",
      asset_type_id: "t1",
      asset_status_id: "s1",
      name: "Villa A1",
      code: "A1",
      description: null,
      owner: null,
      notes: null,
      assignees: ["Sam", "Jordan"],
      metadata: { bedrooms: 4 },
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      ...overrides,
    } as never;
  }

  it("passes through core fields and stringifies assignees", () => {
    const asset = toAsset(row());
    expect(asset.name).toBe("Villa A1");
    expect(asset.assignees).toEqual(["Sam", "Jordan"]);
    expect(asset.metadata).toEqual({ bedrooms: 4 });
  });

  it("filters non-string assignees", () => {
    const asset = toAsset(row({ assignees: ["Sam", 5, null, "Jordan"] }));
    expect(asset.assignees).toEqual(["Sam", "Jordan"]);
  });

  it("defaults metadata to {} for null or non-object values", () => {
    expect(toAsset(row({ metadata: null })).metadata).toEqual({});
    expect(toAsset(row({ metadata: "scalar" })).metadata).toEqual({});
    expect(toAsset(row({ metadata: [1, 2] })).metadata).toEqual({});
  });
});