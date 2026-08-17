import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({
  isSupabaseConfigured: () => true,
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

import { createFakeClientFromStore, createSharedStore } from "../helpers/fakeClient";
import { createAsset, getAsset, listAssets, updateAsset } from "@/actions/assets";

function makeContext(tables: Record<string, unknown[]>) {
  const store = createSharedStore(tables as never);
  ctx.client = createFakeClientFromStore(store);
  ctx.admin = createFakeClientFromStore(store);
  return store;
}

const PROJECT = "123e4567-e89b-12d3-a456-426614174000";
const TYPE = "223e4567-e89b-12d3-a456-426614174001";
const STATUS = "323e4567-e89b-12d3-a456-426614174002";

const BASE = {
  projects: [
    { id: PROJECT, name: "Site", slug: "site", status: "active", deleted_at: null },
  ],
  asset_types: [{ id: TYPE, name: "Villa", slug: "villa", deleted_at: null }],
  asset_statuses: [
    { id: STATUS, name: "Available", slug: "available", color: "#22c55e", deleted_at: null },
  ],
  assets: [],
  notifications: [],
};

describe("asset actions", () => {
  it("createAsset returns a success envelope with the mapped asset", async () => {
    makeContext(BASE);
    const res = await createAsset({
      project_id: PROJECT,
      name: "Villa A1",
      code: "A1",
      asset_type_id: TYPE,
      asset_status_id: STATUS,
      metadata: { bedrooms: 4 },
    });
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.name).toBe("Villa A1");
    expect(res.data.code).toBe("A1");
    expect(res.data.asset_type_id).toBe(TYPE);
    expect(res.data.asset_status_id).toBe(STATUS);
    expect(res.data.metadata).toEqual({ bedrooms: 4 });
    expect(res.data.assignees).toEqual([]);
  });

  it("createAsset maps missing project to the error envelope", async () => {
    makeContext({ ...BASE, projects: [] });
    const res = await createAsset({ project_id: PROJECT, name: "X" });
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error.code).toBe("PROJECT_NOT_FOUND");
  });

  it("createAsset maps unknown type to the error envelope", async () => {
    makeContext(BASE);
    const res = await createAsset({ project_id: PROJECT, name: "X", asset_type_id: "99999999-9999-4999-8999-999999999999" });
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error.code).toBe("ASSET_TYPE_NOT_FOUND");
  });

  it("listAssets paginates and applies the project filter", async () => {
    const assets = [
      { id: "a1", project_id: PROJECT, name: "One", deleted_at: null },
      { id: "a2", project_id: PROJECT, name: "Two", deleted_at: null },
      { id: "a3", project_id: "other-project", name: "Three", deleted_at: null },
    ];
    makeContext({ ...BASE, assets });
    const res = await listAssets({ project_id: PROJECT, page: 1, limit: 1 });
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data).toHaveLength(1);
    expect(res.pagination.total).toBe(2);
  });

  it("getAsset maps missing assets to the error envelope", async () => {
    makeContext(BASE);
    const res = await getAsset("missing");
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error.code).toBe("ASSET_NOT_FOUND");
  });

  it("updateAsset persists changes and only notifies newly added assignees", async () => {
    const store = makeContext({
      ...BASE,
      assets: [
        { id: "a1", project_id: PROJECT, name: "Villa", assignees: ["Sam"], deleted_at: null },
      ],
    });
    const res = await updateAsset("a1", { assignees: ["Sam", "Jordan"] });
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.assignees).toEqual(["Sam", "Jordan"]);

    const notes = store.get("notifications") ?? [];
    const recipients = notes.map((n) => n.recipient);
    expect(recipients).toContain("Jordan");
    expect(recipients).not.toContain("Sam");
  });
});