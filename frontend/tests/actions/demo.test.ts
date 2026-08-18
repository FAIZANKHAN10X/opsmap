import { describe, expect, it, vi } from "vitest";

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

import { createFakeClientFromStore, createSharedStore } from "../helpers/fakeClient";
import { getAsset, listAssets } from "@/actions/assets";
import { getProjectSummary } from "@/actions/dashboard";
import { DEMO_ASSETS, DEMO_PROJECT_ID } from "@/lib/demo/dataset";

const REAL_PROJECT = "123e4567-e89b-12d3-a456-426614174000";
const REAL_ASSET = "223e4567-e89b-12d3-a456-426614174001";

const STATUSES = [
  { id: "s1", name: "Available", slug: "available", color: "#22c55e", sort_order: 1, deleted_at: null },
  { id: "s2", name: "Reserved", slug: "reserved", color: "#38bdf8", sort_order: 2, deleted_at: null },
  { id: "s3", name: "Occupied", slug: "occupied", color: "#f59e0b", sort_order: 3, deleted_at: null },
  { id: "s4", name: "Sold", slug: "sold", color: "#c026d3", sort_order: 4, deleted_at: null },
  { id: "s5", name: "Maintenance", slug: "maintenance", color: "#ef4444", sort_order: 5, deleted_at: null },
  { id: "s6", name: "Pending", slug: "pending", color: "#a78bfa", sort_order: 6, deleted_at: null },
  { id: "s7", name: "Offline", slug: "offline", color: "#64748b", sort_order: 7, deleted_at: null },
];

function makeContext() {
  const store = createSharedStore({
    projects: [{ id: REAL_PROJECT, name: "Real Site", slug: "real", status: "active", deleted_at: null }],
    asset_types: [],
    asset_statuses: STATUSES,
    assets: [
      { id: REAL_ASSET, project_id: REAL_PROJECT, asset_status_id: "s1", name: "Real Villa", code: "R-1", deleted_at: null, metadata: { capacity: 4, placed: 2 } },
    ],
    notifications: [],
  });
  ctx.client = createFakeClientFromStore(store);
  ctx.admin = createFakeClientFromStore(store);
  return store;
}

describe("demo-aware server actions", () => {
  it("listAssets returns demo data when demo is on and real data when off", async () => {
    makeContext();
    const demo = await listAssets(undefined, true);
    expect(demo.success).toBe(true);
    if (!demo.success) return;
    expect(demo.data).toHaveLength(16);
    expect(demo.pagination.total).toBe(16);

    const real = await listAssets({ project_id: REAL_PROJECT }, false);
    expect(real.success).toBe(true);
    if (!real.success) return;
    expect(real.data.map((a) => a.id)).toEqual([REAL_ASSET]);
  });

  it("demo listAssets ignores the real project filter and applies status filters", async () => {
    makeContext();
    const res = await listAssets(
      { project_id: REAL_PROJECT, status_slugs: ["available"] },
      true,
    );
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data).toHaveLength(4);
  });

  it("getAsset serves demo assets only while demo is on", async () => {
    makeContext();
    const demoOk = await getAsset(DEMO_ASSETS[0].id, true);
    expect(demoOk.success).toBe(true);
    if (!demoOk.success) return;
    expect(demoOk.data.name).toBe("Villa Melasti");

    const demoIdOff = await getAsset(DEMO_ASSETS[0].id, false);
    expect(demoIdOff.success).toBe(false);
    if (demoIdOff.success) return;
    expect(demoIdOff.error.code).toBe("ASSET_NOT_FOUND");

    const realIdOn = await getAsset(REAL_ASSET, true);
    expect(realIdOn.success).toBe(false);
  });

  it("getProjectSummary returns the demo summary when demo is on", async () => {
    makeContext();
    const real = await getProjectSummary(REAL_PROJECT, false);
    expect(real.success).toBe(true);
    if (!real.success) return;
    expect(real.data.project_id).toBe(REAL_PROJECT);
    expect(real.data.total_assets).toBe(1);

    const demo = await getProjectSummary(REAL_PROJECT, true);
    expect(demo.success).toBe(true);
    if (!demo.success) return;
    expect(demo.data.project_id).toBe(DEMO_PROJECT_ID);
    expect(demo.data.total_assets).toBe(16);
    expect(demo.data.kpis?.placed).toBe(25);
  });

  it("never writes to the database during demo calls", async () => {
    const store = makeContext();
    const snapshot = JSON.stringify(store.get("assets"));

    await listAssets(undefined, true);
    await getAsset(DEMO_ASSETS[0].id, true);
    await getProjectSummary(REAL_PROJECT, true);

    expect(JSON.stringify(store.get("assets"))).toBe(snapshot);
  });
});
