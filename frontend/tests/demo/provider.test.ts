import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createFakeClient, createFakeClientFromStore, createSharedStore } from "../helpers/fakeClient";
import { NotFoundError } from "@/lib/server/errors";
import {
  buildDemoProjectSummary,
  getDemoAsset,
  listDemoAssets,
} from "@/lib/demo/provider";
import { DEMO_ASSETS, DEMO_PROJECT_ID } from "@/lib/demo/dataset";

const REAL_PROJECT = "123e4567-e89b-12d3-a456-426614174000";
const TYPE_VILLA = "223e4567-e89b-12d3-a456-426614174001";

const STATUSES = [
  { id: "s1", name: "Available", slug: "available", color: "#22c55e", sort_order: 1, deleted_at: null },
  { id: "s2", name: "Reserved", slug: "reserved", color: "#38bdf8", sort_order: 2, deleted_at: null },
  { id: "s3", name: "Occupied", slug: "occupied", color: "#f59e0b", sort_order: 3, deleted_at: null },
  { id: "s4", name: "Sold", slug: "sold", color: "#c026d3", sort_order: 4, deleted_at: null },
  { id: "s5", name: "Maintenance", slug: "maintenance", color: "#ef4444", sort_order: 5, deleted_at: null },
  { id: "s6", name: "Pending", slug: "pending", color: "#a78bfa", sort_order: 6, deleted_at: null },
  { id: "s7", name: "Offline", slug: "offline", color: "#64748b", sort_order: 7, deleted_at: null },
];

function makeClient(realAssets: Record<string, unknown>[]) {
  return createFakeClient({
    projects: [{ id: REAL_PROJECT, name: "Real Site", slug: "real", deleted_at: null }],
    asset_types: [{ id: TYPE_VILLA, name: "Villa", slug: "villa", sort_order: 1, deleted_at: null }],
    asset_statuses: STATUSES,
    assets: realAssets,
  });
}

const REAL_ASSETS = [
  { id: "r1", project_id: REAL_PROJECT, asset_status_id: "s1", name: "Real Villa", code: "R-1", deleted_at: null, metadata: { capacity: 4, placed: 2 } },
  { id: "r2", project_id: REAL_PROJECT, asset_status_id: "s4", name: "Real Sold", code: "R-2", deleted_at: null, metadata: { capacity: 6, placed: 0 } },
];

describe("demo provider", () => {
  it("serves the demo dataset only — real rows are never included", async () => {
    const client = makeClient(REAL_ASSETS);
    const { items, total } = await listDemoAssets(client, { page: 1, limit: 100 });
    expect(total).toBe(16);
    expect(items).toHaveLength(16);
    expect(items.every((a) => a.project_id === DEMO_PROJECT_ID)).toBe(true);
    expect(items.some((a) => a.id === "r1")).toBe(false);
  });

  it("resolves demo status/type slugs against the real status engine", async () => {
    const client = makeClient(REAL_ASSETS);
    const { items } = await listDemoAssets(client, { page: 1, limit: 100 });
    const melasti = items.find((a) => a.code === "V-101");
    expect(melasti).toBeDefined();
    expect(melasti?.asset_status_id).toBe("s1"); // available
    expect(melasti?.asset_type_id).toBe(TYPE_VILLA);
  });

  it("filters demo assets by status slug", async () => {
    const client = makeClient(REAL_ASSETS);
    const { items, total } = await listDemoAssets(client, {
      page: 1,
      limit: 100,
      status_slugs: ["available"],
    });
    expect(total).toBe(4);
    expect(items.every((a) => a.asset_status_id === "s1")).toBe(true);
  });

  it("searches demo assets by name and by assignee", async () => {
    const client = makeClient(REAL_ASSETS);
    const byName = await listDemoAssets(client, { page: 1, limit: 100, search: "melasti" });
    expect(byName.total).toBe(1);
    expect(byName.items[0]?.name).toBe("Villa Melasti");

    const byAssignee = await listDemoAssets(client, { page: 1, limit: 100, search: "budi" });
    expect(byAssignee.total).toBeGreaterThan(0);
    expect(
      byAssignee.items.every((a) =>
        [a.name, a.code, a.description, a.owner, a.notes, ...(a.assignees as string[])]
          .filter((v): v is string => typeof v === "string")
          .join(" ")
          .toLowerCase()
          .includes("budi"),
      ),
    ).toBe(true);
  });

  it("paginates demo results with the full filtered total", async () => {
    const client = makeClient(REAL_ASSETS);
    const page1 = await listDemoAssets(client, { page: 1, limit: 5 });
    const page2 = await listDemoAssets(client, { page: 2, limit: 5 });
    expect(page1.items).toHaveLength(5);
    expect(page2.items).toHaveLength(5);
    expect(page1.total).toBe(16);
    expect(page1.items[0]?.id).not.toBe(page2.items[0]?.id);
  });

  it("gets a single demo asset and 404s for unknown ids", async () => {
    const client = makeClient(REAL_ASSETS);
    const asset = await getDemoAsset(client, DEMO_ASSETS[0].id);
    expect(asset.name).toBe("Villa Melasti");
    await expect(getDemoAsset(client, "missing-asset")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("computes the 8AM HUB KPIs from the demo dataset via the shared path", async () => {
    const client = makeClient(REAL_ASSETS);
    const summary = await buildDemoProjectSummary(client);
    expect(summary.project_id).toBe(DEMO_PROJECT_ID);
    expect(summary.total_assets).toBe(16);
    expect(summary.kpis).toEqual({
      placed: 25,
      placed_capacity: 92,
      villa_capacity: 16,
      spots_open: 4,
      villas_sold_out: 3,
      total_villas: 16,
    });
    // by_status mirrors the real aggregation (statuses with count > 0).
    expect(summary.by_status.find((s) => s.status_slug === "available")?.count).toBe(4);
    expect(summary.by_status.find((s) => s.status_slug === "sold")?.count).toBe(3);
  });

  it("never writes to the database — real rows are untouched", async () => {
    const store = createSharedStore({
      projects: [{ id: REAL_PROJECT, name: "Real Site", slug: "real", deleted_at: null }],
      asset_types: [{ id: TYPE_VILLA, name: "Villa", slug: "villa", sort_order: 1, deleted_at: null }],
      asset_statuses: STATUSES,
      assets: REAL_ASSETS,
    });
    const client = createFakeClientFromStore(store);
    const snapshot = JSON.stringify(store.get("assets"));

    await listDemoAssets(client, { page: 1, limit: 100, status_slugs: ["available"] });
    await buildDemoProjectSummary(client);
    await expect(getDemoAsset(client, DEMO_ASSETS[0].id)).resolves.toBeDefined();

    expect(JSON.stringify(store.get("assets"))).toBe(snapshot);
  });
});
