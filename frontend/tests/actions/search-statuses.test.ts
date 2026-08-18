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
import { adminAuthUser, adminProfile } from "../helpers/auth";
import { createAssetStatus, deleteAssetStatus } from "@/actions/asset-statuses";
import { searchAssets, searchSuggestions } from "@/actions/search";

function makeContext(tables: Record<string, unknown[]>) {
  const store = createSharedStore({
    ...tables,
    profiles: [...(tables.profiles ?? []), adminProfile],
  } as never);
  ctx.client = createFakeClientFromStore(store, { user: adminAuthUser });
  ctx.admin = createFakeClientFromStore(store, { user: adminAuthUser });
  return store;
}

const PROJECT = "123e4567-e89b-12d3-a456-426614174000";
const STATUS = "223e4567-e89b-12d3-a456-426614174001";

describe("asset-status actions", () => {
  it("createAssetStatus returns a success envelope and normalizes the color", async () => {
    makeContext({ asset_statuses: [] });
    const res = await createAssetStatus({
      name: "Available",
      slug: "available",
      color: "#22C55E",
      sort_order: 1,
    });
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.slug).toBe("available");
    expect(res.data.color).toBe("#22c55e");
  });

  it("createAssetStatus maps an invalid color to the error envelope", async () => {
    makeContext({ asset_statuses: [] });
    const res = await createAssetStatus({ name: "Broken", slug: "broken", color: "red" });
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error.code).toBe("VALIDATION_ERROR");
  });

  it("deleteAssetStatus blocks deletion while assets use the status", async () => {
    makeContext({
      asset_statuses: [{ id: STATUS, name: "Sold", slug: "sold", color: "#c026d3", deleted_at: null }],
      assets: [{ id: "a1", asset_status_id: STATUS, deleted_at: null }],
    });
    const res = await deleteAssetStatus(STATUS);
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("search actions", () => {
  const assets = [
    { id: "a1", project_id: PROJECT, name: "Luxury Villa North", code: "LV-01", asset_status_id: STATUS, deleted_at: null },
    { id: "a2", project_id: PROJECT, name: "Parking Bay 9", code: "P-09", asset_status_id: null, deleted_at: null },
  ];

  it("searchAssets returns a paginated success envelope", async () => {
    makeContext({
      projects: [{ id: PROJECT, name: "Site", slug: "site", status: "active", deleted_at: null }],
      asset_statuses: [{ id: STATUS, name: "Available", slug: "available", color: "#22c55e", deleted_at: null }],
      assets,
    });
    const res = await searchAssets({ project_id: PROJECT, q: "luxury", page: 1, limit: 10 });
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data).toHaveLength(1);
    expect(res.data[0].code).toBe("LV-01");
    expect(res.pagination.total).toBe(1);
  });

  it("searchAssets maps a missing project to the error envelope", async () => {
    makeContext({ projects: [], asset_statuses: [], assets: [] });
    const res = await searchAssets({ project_id: PROJECT, q: "x" });
    expect(res.success).toBe(false);
    expect(res).toMatchObject({ error: { code: "PROJECT_NOT_FOUND" } });
  });

  it("searchSuggestions returns a success envelope with labels", async () => {
    makeContext({
      projects: [{ id: PROJECT, name: "Site", slug: "site", status: "active", deleted_at: null }],
      asset_statuses: [{ id: STATUS, name: "Available", slug: "available", color: "#22c55e", deleted_at: null }],
      assets,
    });
    const res = await searchSuggestions("villa", { project_id: PROJECT, limit: 5 });
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data[0]).toHaveProperty("label");
  });
});