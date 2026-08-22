import "server-only";

import type { Client } from "@/lib/server/repositories/base";
import { NotFoundError } from "@/lib/server/errors";
import { AssetStatusRepository } from "@/lib/server/repositories/asset-statuses";
import { AssetTypeRepository } from "@/lib/server/repositories/asset-types";
import type { AssetRow } from "@/lib/server/repositories/assets";
import type { ContactRow } from "@/lib/server/repositories/contacts";
import type { ProjectRow } from "@/lib/server/repositories/projects";
import { summarizeProject } from "@/lib/server/services/dashboard";
import { ALLOWED_SORT_FIELDS } from "@/lib/server/constants";
import type { ContactPropertyLink, ProjectSummary } from "@/types/domain";
import {
  DEMO_ASSETS,
  DEMO_CONTACTS,
  DEMO_PROJECT,
  DEMO_PROJECT_ID,
  demoAssetCoordinates,
  demoCreatedAt,
} from "./dataset";

/**
 * Server-side Demo/Mock Data provider (Phase 13).
 *
 * Selected by an explicit `demo` flag on the existing server actions; the
 * client never writes, seeds, or mutates anything. Demo assets are materialized
 * per request by resolving their status/type slugs against the REAL status
 * engine (so legend/status/filter machinery drives them), then fed through the
 * SAME aggregation (`summarizeProject`) and the SAME filter/sort semantics as
 * real data. There is no second data architecture and no database writes.
 */

type DemoFilters = {
  page: number;
  limit: number;
  search?: string | null;
  status_slugs?: string[];
  type_slugs?: string[];
  placement?: "placed" | "unplaced" | null;
  sort?: string;
  order?: string;
  price_min?: number | null;
  price_max?: number | null;
  currency?: string | null;
  bedrooms_min?: number | null;
  bathrooms_min?: number | null;
  area_min?: number | null;
  area_max?: number | null;
  furnishing?: string | null;
  features?: string[];
};

function matchesSearch(asset: DemoSeedWithIds, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const meta = asset.metadata as Record<string, unknown>;
  const haystack = [
    asset.name,
    asset.code,
    asset.description,
    asset.owner,
    asset.notes,
    ...asset.assignees,
    typeof meta.address === "string" ? meta.address : "",
    typeof meta.view === "string" ? meta.view : "",
    typeof meta.furnishing === "string" ? meta.furnishing : "",
    typeof meta.floor === "string" ? meta.floor : "",
    Array.isArray(meta.features) ? (meta.features as string[]).join(" ") : "",
  ]
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function demoMetaNum(asset: DemoSeedWithIds, key: string): number | null {
  const v = (asset.metadata as Record<string, unknown>)[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

type DemoSeedWithIds = {
  id: string;
  project_id: string;
  asset_type_id: string | null;
  asset_status_id: string | null;
  name: string;
  code: string | null;
  description: string | null;
  owner: string | null;
  notes: string | null;
  assignees: string[];
  metadata: Record<string, unknown>;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
};

/** Resolve demo seeds into fully-typed asset rows, resolved against the DB. */
async function materializeDemoAssets(client: Client): Promise<DemoSeedWithIds[]> {
  const statuses = await new AssetStatusRepository(client).list({
    page: 1,
    limit: 100,
  });
  const types = await new AssetTypeRepository(client).list({
    page: 1,
    limit: 100,
  });
  const statusIdBySlug = new Map(statuses.items.map((s) => [s.slug, s.id]));
  const typeIdBySlug = new Map(types.items.map((t) => [t.slug, t.id]));

  return DEMO_ASSETS.map((seed, index) => {
    const created = demoCreatedAt(index + 1);
    const coords = demoAssetCoordinates(seed.id);
    return {
      id: seed.id,
      project_id: DEMO_PROJECT_ID,
      asset_type_id: seed.typeSlug ? (typeIdBySlug.get(seed.typeSlug) ?? null) : null,
      asset_status_id: statusIdBySlug.get(seed.statusSlug) ?? null,
      name: seed.name,
      code: seed.code,
      description: seed.description,
      owner: seed.owner,
      notes: seed.notes,
      assignees: seed.assignees,
      metadata: seed.metadata,
      latitude: coords.latitude,
      longitude: coords.longitude,
      created_at: created,
      updated_at: created,
    };
  });
}

/** List demo assets with the same filter/sort/pagination semantics as real data. */
export async function listDemoAssets(
  client: Client,
  filters: DemoFilters,
): Promise<{ items: AssetRow[]; total: number }> {
  const all = await materializeDemoAssets(client);
  const seedByAssetId = new Map(DEMO_ASSETS.map((seed) => [seed.id, seed]));

  const statusSet = new Set(filters.status_slugs ?? []);
  const typeSet = new Set(filters.type_slugs ?? []);

  let matched = all;
  if (filters.search) matched = matched.filter((a) => matchesSearch(a, filters.search ?? ""));
  if (statusSet.size > 0) {
    matched = matched.filter((a) =>
      statusSet.has(seedByAssetId.get(a.id)?.statusSlug ?? ""),
    );
  }
  if (typeSet.size > 0) {
    matched = matched.filter((a) =>
      typeSet.has(seedByAssetId.get(a.id)?.typeSlug ?? ""),
    );
  }
  if (filters.placement === "placed") {
    matched = matched.filter(
      (a) => a.latitude !== null && a.longitude !== null,
    );
  } else if (filters.placement === "unplaced") {
    matched = matched.filter(
      (a) => a.latitude === null || a.longitude === null,
    );
  }
  if (filters.price_min != null) {
    matched = matched.filter((a) => {
      const v = demoMetaNum(a, "price");
      return v != null && v >= (filters.price_min as number);
    });
  }
  if (filters.price_max != null) {
    matched = matched.filter((a) => {
      const v = demoMetaNum(a, "price");
      return v != null && v <= (filters.price_max as number);
    });
  }
  if (filters.currency && filters.currency.trim()) {
    const cur = filters.currency.trim().toUpperCase();
    matched = matched.filter(
      (a) => String((a.metadata as Record<string, unknown>).currency ?? "").toUpperCase() === cur,
    );
  }
  if (filters.bedrooms_min != null) {
    matched = matched.filter((a) => {
      const v = demoMetaNum(a, "bedrooms");
      return v != null && v >= (filters.bedrooms_min as number);
    });
  }
  if (filters.bathrooms_min != null) {
    matched = matched.filter((a) => {
      const v = demoMetaNum(a, "bathrooms");
      return v != null && v >= (filters.bathrooms_min as number);
    });
  }
  if (filters.area_min != null) {
    matched = matched.filter((a) => {
      const v = demoMetaNum(a, "area_sqm");
      return v != null && v >= (filters.area_min as number);
    });
  }
  if (filters.area_max != null) {
    matched = matched.filter((a) => {
      const v = demoMetaNum(a, "area_sqm");
      return v != null && v <= (filters.area_max as number);
    });
  }
  if (filters.furnishing && filters.furnishing.trim()) {
    const f = filters.furnishing.trim().toLowerCase();
    matched = matched.filter(
      (a) => String((a.metadata as Record<string, unknown>).furnishing ?? "").toLowerCase() === f,
    );
  }
  if (filters.features && filters.features.length > 0) {
    const wanted = filters.features.map((s) => s.trim().toLowerCase()).filter(Boolean);
    matched = matched.filter((a) => {
      const feats = (a.metadata as Record<string, unknown>).features;
      if (!Array.isArray(feats)) return false;
      const lower = (feats as string[]).map((x) => String(x).toLowerCase());
      return wanted.every((w) => lower.includes(w));
    });
  }

  const sortKey = ALLOWED_SORT_FIELDS.has(filters.sort ?? "")
    ? (filters.sort as string)
    : "created_at";
  const order = filters.order?.toLowerCase() === "asc" ? "asc" : "desc";
  const sorted = [...matched].sort((a, b) => {
    const av = (a[sortKey as keyof DemoSeedWithIds] ?? "") as string | number;
    const bv = (b[sortKey as keyof DemoSeedWithIds] ?? "") as string | number;
    if (av === bv) return 0;
    const cmp = av < bv ? -1 : 1;
    return order === "asc" ? cmp : -cmp;
  });

  const from = (filters.page - 1) * filters.limit;
  const items = sorted.slice(from, from + filters.limit);
  return { items: items as AssetRow[], total: sorted.length };
}

/** Fetch a single demo asset by id. */
export async function getDemoAsset(
  client: Client,
  id: string,
): Promise<AssetRow> {
  const assets = await materializeDemoAssets(client);
  const asset = assets.find((a) => a.id === id);
  if (!asset) throw new NotFoundError("ASSET_NOT_FOUND", "Asset not found.");
  return asset as AssetRow;
}

// ---------------------------------------------------------------------------
// Demo contacts (Phase 2) — derived from the demo asset owners/assignees.
// Self-contained: no database reads/writes, same shape as the real ContactRow.
// ---------------------------------------------------------------------------

function demoContactRows(): ContactRow[] {
  const at = "2026-07-01T00:00:00.000Z";
  return DEMO_CONTACTS.map((seed) => ({
    id: seed.id,
    type: seed.type,
    full_name: seed.full_name,
    company: seed.company,
    email: seed.email,
    phone: seed.phone,
    whatsapp: seed.whatsapp,
    notes: seed.notes,
    created_at: at,
    updated_at: at,
    created_by: null,
    updated_by: null,
    deleted_at: null,
  }));
}

function demoContactLinks(): Array<ContactPropertyLink & { contact_id: string }> {
  return DEMO_CONTACTS.flatMap((seed) =>
    seed.links.map((link) => {
      const asset = DEMO_ASSETS.find((a) => a.id === link.assetId);
      return {
        contact_id: seed.id,
        asset_id: link.assetId,
        asset_name: asset?.name ?? "—",
        project_id: DEMO_PROJECT_ID,
        role: link.role,
      };
    }),
  );
}

export async function listDemoContacts(filters: {
  page: number;
  limit: number;
  search?: string | null;
  type?: string | null;
}): Promise<{
  items: ContactRow[];
  total: number;
  linksByContactId: Record<string, ContactPropertyLink[]>;
}> {
  const all = demoContactRows();
  const links = demoContactLinks();

  let matched = all;
  if (filters.type) matched = matched.filter((c) => c.type === filters.type);
  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    matched = matched.filter((c) =>
      [c.full_name, c.company, c.email]
        .filter((v): v is string => typeof v === "string" && v.length > 0)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }
  matched = [...matched].sort((a, b) => a.full_name.localeCompare(b.full_name));

  const from = (filters.page - 1) * filters.limit;
  const items = matched.slice(from, from + filters.limit);

  const linksByContactId: Record<string, ContactPropertyLink[]> = {};
  const pageIds = new Set(items.map((c) => c.id));
  for (const link of links) {
    if (pageIds.has(link.contact_id)) {
      (linksByContactId[link.contact_id] ??= []).push(link);
    }
  }
  return { items, total: matched.length, linksByContactId };
}

export async function getDemoContact(
  id: string,
): Promise<{ contact: ContactRow; links: ContactPropertyLink[] }> {
  const contact = demoContactRows().find((c) => c.id === id);
  if (!contact) throw new NotFoundError("CONTACT_NOT_FOUND", "Contact not found.");
  const links = demoContactLinks().filter((l) => l.contact_id === id);
  return { contact, links };
}

/** Demo contacts linked to a specific property (property details surface). */
export async function listDemoAssetContacts(
  assetId: string,
): Promise<Array<{ contact: ContactRow; role: string }>> {
  const links = demoContactLinks().filter((l) => l.asset_id === assetId);
  const rows = demoContactRows();
  const byId = new Map(rows.map((c) => [c.id, c]));
  return links
    .filter((l) => byId.has(l.contact_id))
    .map((l) => ({ contact: byId.get(l.contact_id) as ContactRow, role: l.role }));
}

/** The demo project record (static — never written to the database). */
export function getDemoProject(): ProjectRow {
  const at = "2026-07-01T00:00:00.000Z";
  return {
    id: DEMO_PROJECT.id,
    name: DEMO_PROJECT.name,
    slug: DEMO_PROJECT.slug,
    description: DEMO_PROJECT.description,
    status: DEMO_PROJECT.status,
    created_at: at,
    updated_at: at,
    created_by: null,
    updated_by: null,
    deleted_at: null,
  };
}

/**
 * Demo dashboard summary — KPIs emerge from the demo dataset through the
 * exact same aggregation path as real projects.
 */
export async function buildDemoProjectSummary(
  client: Client,
): Promise<ProjectSummary> {
  const statuses = await new AssetStatusRepository(client).list({
    page: 1,
    limit: 100,
  });
  const assets = await materializeDemoAssets(client);
  return summarizeProject(statuses.items, assets, DEMO_PROJECT_ID);
}

export async function buildDemoProjectAttention(): Promise<
  import("@/lib/server/services/dashboard").AttentionData
> {
  // Demo has 16 placed villas, all with capacity/price, 1 maintenance, 0 unplaced, 0 missing ops, 0 without contacts, but 16 without photos (no docs fixture)
  // For dashboard we suppress withoutPhotos as demo limitation and show 0
  return {
    totalActive: 10, // available(4)+reserved(1)+occupied(3)+pending(2)
    withoutPhotos: 0, // suppressed — demo has no document fixtures
    unplaced: 0,
    missingOps: 0,
    withoutContacts: 0,
    maintenance: 1,
    issues: [
      {
        key: "maintenance",
        label: "1 property is in maintenance",
        count: 1,
        description: "Maintenance properties need attention.",
        severity: "warning",
        actionLabel: "View maintenance",
        href: "/dashboard/development?status=maintenance",
      },
    ],
    propertiesNeedingAttention: [
      {
        id: DEMO_ASSETS[13].id,
        name: DEMO_ASSETS[13].name,
        code: DEMO_ASSETS[13].code,
        statusSlug: "maintenance",
        statusName: "Maintenance",
        issues: ["Maintenance"],
        updatedAt: demoCreatedAt(14),
      },
    ],
  };
}

export async function buildDemoRecentActivity(): Promise<
  import("@/lib/server/services/dashboard").RecentActivityItem[]
> {
  // Derived from demo updated_at (staggered creation dates)
  const items = DEMO_ASSETS.slice(0, 5).map((a, idx) => ({
    id: a.id,
    kind: "property" as const,
    title: a.name,
    subtitle: a.code,
    href: `/dashboard/properties/${a.id}`,
    updatedAt: demoCreatedAt(16 - idx),
  }));
  return items;
}

export async function buildDemoDashboardData(
  client: Client,
): Promise<import("@/lib/server/services/dashboard").DashboardData> {
  const summary = await buildDemoProjectSummary(client);
  const attention = await buildDemoProjectAttention();
  const recentActivity = await buildDemoRecentActivity();
  return { summary, attention, recentActivity };
}
