/**
 * Static mock dataset for the dashboard / interactive workspace.
 * Shapes match backend domain models so services can swap to HTTP later.
 *
 * map_x / map_y in metadata are workspace coordinates (world pixels).
 */

import type {
  Asset,
  AssetStatus,
  AssetType,
  Project,
  ProjectSummary,
} from "@/types/domain";

const now = "2026-07-30T12:00:00Z";

export const MOCK_PROJECTS: Project[] = [
  {
    id: "22222222-2222-2222-2222-222222222201",
    name: "Harbor Villas",
    slug: "harbor-villas",
    description: "Phase 1 residential development",
    status: "active",
    created_at: now,
    updated_at: now,
  },
  {
    id: "22222222-2222-2222-2222-222222222202",
    name: "West Dock Warehouse",
    slug: "west-dock",
    description: "Logistics floor layout",
    status: "active",
    created_at: now,
    updated_at: now,
  },
  {
    id: "22222222-2222-2222-2222-222222222203",
    name: "Empty Site (demo)",
    slug: "empty-site",
    description: "Used to demonstrate empty state",
    status: "active",
    created_at: now,
    updated_at: now,
  },
];

export const MOCK_ASSET_TYPES: AssetType[] = [
  {
    id: "33333333-3333-3333-3333-333333333301",
    name: "Villa",
    slug: "villa",
    description: null,
    sort_order: 1,
    created_at: now,
    updated_at: now,
  },
  {
    id: "33333333-3333-3333-3333-333333333302",
    name: "Parking",
    slug: "parking",
    description: null,
    sort_order: 2,
    created_at: now,
    updated_at: now,
  },
  {
    id: "33333333-3333-3333-3333-333333333303",
    name: "Unit",
    slug: "unit",
    description: null,
    sort_order: 3,
    created_at: now,
    updated_at: now,
  },
];

export const MOCK_ASSET_STATUSES: AssetStatus[] = [
  {
    id: "44444444-4444-4444-4444-444444444401",
    name: "Available",
    slug: "available",
    description: null,
    color: "#22c55e",
    sort_order: 1,
    created_at: now,
    updated_at: now,
  },
  {
    id: "44444444-4444-4444-4444-444444444402",
    name: "Occupied",
    slug: "occupied",
    description: null,
    color: "#f59e0b",
    sort_order: 2,
    created_at: now,
    updated_at: now,
  },
  {
    id: "44444444-4444-4444-4444-444444444403",
    name: "Reserved",
    slug: "reserved",
    description: null,
    color: "#38bdf8",
    sort_order: 3,
    created_at: now,
    updated_at: now,
  },
  {
    id: "44444444-4444-4444-4444-444444444404",
    name: "Maintenance",
    slug: "maintenance",
    description: null,
    color: "#ef4444",
    sort_order: 4,
    created_at: now,
    updated_at: now,
  },
  {
    id: "44444444-4444-4444-4444-444444444405",
    name: "Offline",
    slug: "offline",
    description: null,
    color: "#64748b",
    sort_order: 5,
    created_at: now,
    updated_at: now,
  },
];

const statusBySlug = Object.fromEntries(
  MOCK_ASSET_STATUSES.map((s) => [s.slug, s]),
);

const typeBySlug = Object.fromEntries(MOCK_ASSET_TYPES.map((t) => [t.slug, t]));

function asset(
  id: string,
  projectId: string,
  name: string,
  code: string,
  typeSlug: string,
  statusSlug: string,
  meta: Record<string, unknown> = {},
): Asset {
  return {
    id,
    project_id: projectId,
    asset_type_id: typeBySlug[typeSlug]?.id ?? null,
    asset_status_id: statusBySlug[statusSlug]?.id ?? null,
    name,
    code,
    description: null,
    metadata: meta,
    created_at: now,
    updated_at: now,
  };
}

const harborId = MOCK_PROJECTS[0].id;
const dockId = MOCK_PROJECTS[1].id;

/** Harbor Villas — loosely arranged site plan. */
export const MOCK_ASSETS: Asset[] = [
  asset("a0000001-0000-4000-8000-000000000001", harborId, "Villa A1", "A1", "villa", "available", {
    bedrooms: 4,
    map_x: 280,
    map_y: 260,
  }),
  asset("a0000001-0000-4000-8000-000000000002", harborId, "Villa A2", "A2", "villa", "occupied", {
    bedrooms: 3,
    map_x: 420,
    map_y: 260,
  }),
  asset("a0000001-0000-4000-8000-000000000003", harborId, "Villa B1", "B1", "villa", "reserved", {
    bedrooms: 5,
    map_x: 280,
    map_y: 420,
  }),
  asset("a0000001-0000-4000-8000-000000000004", harborId, "Villa B2", "B2", "villa", "maintenance", {
    bedrooms: 4,
    map_x: 420,
    map_y: 420,
  }),
  asset("a0000001-0000-4000-8000-000000000005", harborId, "Villa C1", "C1", "villa", "available", {
    bedrooms: 3,
    map_x: 560,
    map_y: 340,
  }),
  asset("a0000001-0000-4000-8000-000000000006", harborId, "Parking P1", "P1", "parking", "available", {
    map_x: 720,
    map_y: 520,
  }),
  asset("a0000001-0000-4000-8000-000000000007", harborId, "Parking P2", "P2", "parking", "occupied", {
    map_x: 820,
    map_y: 520,
  }),
  asset("a0000001-0000-4000-8000-000000000008", harborId, "Villa D1", "D1", "villa", "offline", {
    map_x: 560,
    map_y: 500,
  }),
  /** West Dock — linear bay layout. */
  asset("a0000001-0000-4000-8000-000000000011", dockId, "Bay 01", "BAY-01", "unit", "available", {
    map_x: 320,
    map_y: 380,
  }),
  asset("a0000001-0000-4000-8000-000000000012", dockId, "Bay 02", "BAY-02", "unit", "occupied", {
    map_x: 480,
    map_y: 380,
  }),
  asset("a0000001-0000-4000-8000-000000000013", dockId, "Bay 03", "BAY-03", "unit", "maintenance", {
    map_x: 640,
    map_y: 380,
  }),
  asset("a0000001-0000-4000-8000-000000000014", dockId, "Bay 04", "BAY-04", "unit", "reserved", {
    map_x: 800,
    map_y: 380,
  }),
];

export function buildProjectSummary(projectId: string): ProjectSummary {
  const assets = MOCK_ASSETS.filter((a) => a.project_id === projectId);
  const by_status = MOCK_ASSET_STATUSES.map((status) => ({
    status_id: status.id,
    status_slug: status.slug,
    status_name: status.name,
    color: status.color ?? "#64748b",
    count: assets.filter((a) => a.asset_status_id === status.id).length,
  })).filter((row) => row.count > 0 || assets.length === 0);

  return {
    project_id: projectId,
    total_assets: assets.length,
    by_status:
      assets.length === 0
        ? MOCK_ASSET_STATUSES.map((status) => ({
            status_id: status.id,
            status_slug: status.slug,
            status_name: status.name,
            color: status.color ?? "#64748b",
            count: 0,
          }))
        : by_status,
  };
}

/** Toggle in mock services for demo error path. */
export let mockForceError = false;

export function setMockForceError(value: boolean): void {
  mockForceError = value;
}
