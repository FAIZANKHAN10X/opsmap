/**
 * Mutable mock store for dashboard + asset management.
 * Shapes match backend domain models.
 */

import type {
  Asset,
  AssetStatus,
  AssetType,
  Document,
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

/** Mutable — Status Engine config is data-driven. */
export let MOCK_ASSET_STATUSES: AssetStatus[] = [
  {
    id: "44444444-4444-4444-4444-444444444401",
    name: "Available",
    slug: "available",
    description: "Ready for use or sale",
    color: "#22c55e",
    sort_order: 1,
    created_at: now,
    updated_at: now,
  },
  {
    id: "44444444-4444-4444-4444-444444444402",
    name: "Reserved",
    slug: "reserved",
    description: "Held for a pending transaction",
    color: "#38bdf8",
    sort_order: 2,
    created_at: now,
    updated_at: now,
  },
  {
    id: "44444444-4444-4444-4444-444444444403",
    name: "Occupied",
    slug: "occupied",
    description: "Currently in use",
    color: "#f59e0b",
    sort_order: 3,
    created_at: now,
    updated_at: now,
  },
  {
    id: "44444444-4444-4444-4444-444444444406",
    name: "Sold",
    slug: "sold",
    description: "Transaction completed",
    color: "#c026d3",
    sort_order: 4,
    created_at: now,
    updated_at: now,
  },
  {
    id: "44444444-4444-4444-4444-444444444404",
    name: "Maintenance",
    slug: "maintenance",
    description: "Temporarily offline for work",
    color: "#ef4444",
    sort_order: 5,
    created_at: now,
    updated_at: now,
  },
  {
    id: "44444444-4444-4444-4444-444444444407",
    name: "Pending",
    slug: "pending",
    description: "Awaiting decision or action",
    color: "#a78bfa",
    sort_order: 6,
    created_at: now,
    updated_at: now,
  },
  {
    id: "44444444-4444-4444-4444-444444444405",
    name: "Offline",
    slug: "offline",
    description: "Not available operationally",
    color: "#64748b",
    sort_order: 7,
    created_at: now,
    updated_at: now,
  },
];

export function setMockAssetStatuses(next: AssetStatus[]): void {
  MOCK_ASSET_STATUSES = next;
}

function statusBySlugMap(): Record<string, AssetStatus> {
  return Object.fromEntries(MOCK_ASSET_STATUSES.map((s) => [s.slug, s]));
}
const typeBySlug = Object.fromEntries(MOCK_ASSET_TYPES.map((t) => [t.slug, t]));

function asset(
  id: string,
  projectId: string,
  name: string,
  code: string,
  typeSlug: string,
  statusSlug: string,
  extras: {
    owner?: string | null;
    notes?: string | null;
    assignees?: string[];
    metadata?: Record<string, unknown>;
  } = {},
): Asset {
  const statusBySlug = statusBySlugMap();
  return {
    id,
    project_id: projectId,
    asset_type_id: typeBySlug[typeSlug]?.id ?? null,
    asset_status_id: statusBySlug[statusSlug]?.id ?? null,
    name,
    code,
    description: null,
    owner: extras.owner ?? null,
    notes: extras.notes ?? null,
    assignees: extras.assignees ?? [],
    metadata: extras.metadata ?? {},
    created_at: now,
    updated_at: now,
  };
}

const harborId = MOCK_PROJECTS[0].id;
const dockId = MOCK_PROJECTS[1].id;

/** Mutable in-memory assets for mock CRUD. */
export let MOCK_ASSETS: Asset[] = [
  asset("a0000001-0000-4000-8000-000000000001", harborId, "Villa A1", "A1", "villa", "available", {
    owner: "Alex Rivera",
    notes: "Corner unit with pool access.",
    assignees: ["Alex Rivera", "Site Ops"],
    metadata: { bedrooms: 4, map_x: 280, map_y: 260 },
  }),
  asset("a0000001-0000-4000-8000-000000000002", harborId, "Villa A2", "A2", "villa", "occupied", {
    owner: "Sam Chen",
    assignees: ["Sam Chen"],
    metadata: { bedrooms: 3, map_x: 420, map_y: 260 },
  }),
  asset("a0000001-0000-4000-8000-000000000003", harborId, "Villa B1", "B1", "villa", "reserved", {
    owner: "Jordan Lee",
    notes: "Hold until deposit clears.",
    assignees: ["Jordan Lee", "Sales Desk"],
    metadata: { bedrooms: 5, map_x: 280, map_y: 420 },
  }),
  asset("a0000001-0000-4000-8000-000000000004", harborId, "Villa B2", "B2", "villa", "maintenance", {
    owner: "Ops Team",
    notes: "AC repair scheduled.",
    assignees: ["Maintenance Crew"],
    metadata: { bedrooms: 4, map_x: 420, map_y: 420 },
  }),
  asset("a0000001-0000-4000-8000-000000000005", harborId, "Villa C1", "C1", "villa", "available", {
    metadata: { bedrooms: 3, map_x: 560, map_y: 340 },
  }),
  asset("a0000001-0000-4000-8000-000000000006", harborId, "Parking P1", "P1", "parking", "available", {
    metadata: { map_x: 720, map_y: 520 },
  }),
  asset("a0000001-0000-4000-8000-000000000007", harborId, "Parking P2", "P2", "parking", "occupied", {
    owner: "Sam Chen",
    metadata: { map_x: 820, map_y: 520 },
  }),
  asset("a0000001-0000-4000-8000-000000000008", harborId, "Villa D1", "D1", "villa", "offline", {
    notes: "Utilities disconnected.",
    metadata: { map_x: 560, map_y: 500 },
  }),
  asset("a0000001-0000-4000-8000-000000000011", dockId, "Bay 01", "BAY-01", "unit", "available", {
    owner: "Dock Lead",
    assignees: ["Dock Lead"],
    metadata: { map_x: 320, map_y: 380 },
  }),
  asset("a0000001-0000-4000-8000-000000000012", dockId, "Bay 02", "BAY-02", "unit", "occupied", {
    metadata: { map_x: 480, map_y: 380 },
  }),
  asset("a0000001-0000-4000-8000-000000000013", dockId, "Bay 03", "BAY-03", "unit", "maintenance", {
    notes: "Door sensor fault.",
    assignees: ["Maintenance Crew"],
    metadata: { map_x: 640, map_y: 380 },
  }),
  asset("a0000001-0000-4000-8000-000000000014", dockId, "Bay 04", "BAY-04", "unit", "reserved", {
    metadata: { map_x: 800, map_y: 380 },
  }),
];

/** Mutable document metadata store. */
export let MOCK_DOCUMENTS: Document[] = [
  {
    id: "d0000001-0000-4000-8000-000000000001",
    asset_id: "a0000001-0000-4000-8000-000000000001",
    name: "Purchase agreement",
    filename: "villa-a1-agreement.pdf",
    mime_type: "application/pdf",
    size_bytes: 245000,
    storage_path: null,
    notes: "Signed copy",
    created_at: now,
    updated_at: now,
  },
  {
    id: "d0000001-0000-4000-8000-000000000002",
    asset_id: "a0000001-0000-4000-8000-000000000001",
    name: "Site photo",
    filename: "a1-front.jpg",
    mime_type: "image/jpeg",
    size_bytes: 890000,
    storage_path: null,
    notes: null,
    created_at: now,
    updated_at: now,
  },
];

export function setMockAssets(next: Asset[]): void {
  MOCK_ASSETS = next;
}

export function setMockDocuments(next: Document[]): void {
  MOCK_DOCUMENTS = next;
}

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

export let mockForceError = false;

export function setMockForceError(value: boolean): void {
  mockForceError = value;
}

export function isoNow(): string {
  return new Date().toISOString();
}

export function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}
