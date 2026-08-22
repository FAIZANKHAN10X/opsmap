import "server-only";

import type { Client } from "@/lib/server/repositories/base";
import { NotFoundError } from "@/lib/server/errors";
import { ProjectRepository } from "@/lib/server/repositories/projects";
import { AssetStatusRepository } from "@/lib/server/repositories/asset-statuses";
import type { AssetStatusRow } from "@/lib/server/repositories/asset-statuses";
import { legendConceptForStatus } from "@/lib/hub-status";
import type { HubKpis, ProjectSummary, StatusCount } from "@/types/domain";

/**
 * Dashboard aggregation. Mirrors the mock buildProjectSummary: per-status
 * counts for a project (statuses with zero assets are included only when the
 * project has no assets at all), ordered by status sort_order.
 *
 * Also computes the 8AM HUB dashboard KPIs (Phase 11) from real data:
 * status counts via the legend mapping plus capacity/placed metadata.
 *
 * `summarizeProject` is the single calculation path shared by real data and
 * Demo/Mock Data mode (Phase 13) — demo KPIs emerge from the demo dataset
 * through exactly the same code, never from hardcoded numbers.
 */

/** Read the first finite numeric value for the given metadata keys (0 default). */
function metaNum(meta: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

type SummarizableAsset = {
  asset_status_id: string | null;
  metadata: unknown;
};

/** Aggregate a list of statuses + assets into a ProjectSummary (KPI path). */
export function summarizeProject(
  statuses: AssetStatusRow[],
  assets: SummarizableAsset[],
  projectId: string,
): ProjectSummary {
  const total = assets.length;
  const counts = new Map<string, number>();
  const statusById = new Map(statuses.map((s) => [s.id, s]));
  const kpis: HubKpis = {
    placed: 0,
    placed_capacity: 0,
    villa_capacity: 0,
    spots_open: 0,
    villas_sold_out: 0,
    total_villas: total,
  };

  for (const asset of assets) {
    if (asset.asset_status_id) {
      counts.set(asset.asset_status_id, (counts.get(asset.asset_status_id) ?? 0) + 1);
    }
    const meta =
      asset.metadata && typeof asset.metadata === "object"
        ? (asset.metadata as Record<string, unknown>)
        : {};
    const capacity = metaNum(meta, ["capacity", "pax"]);
    if (capacity > 0) {
      kpis.villa_capacity += 1;
      kpis.placed_capacity += capacity;
    }
    kpis.placed += metaNum(meta, ["placed"]);
    const status = asset.asset_status_id
      ? statusById.get(asset.asset_status_id)
      : undefined;
    const concept = legendConceptForStatus(status?.slug);
    if (concept === "OPEN") kpis.spots_open += 1;
    if (concept === "SOLD OUT") kpis.villas_sold_out += 1;
  }

  const by_status: StatusCount[] = statuses
    .filter((s) => total === 0 || (counts.get(s.id) ?? 0) > 0)
    .map((s) => ({
      status_id: s.id,
      status_slug: s.slug,
      status_name: s.name,
      color: s.color ?? "#64748b",
      count: counts.get(s.id) ?? 0,
    }));

  return { project_id: projectId, total_assets: total, by_status, kpis };
}

export async function buildProjectSummary(
  client: Client,
  projectId: string,
): Promise<ProjectSummary> {
  const projects = new ProjectRepository(client);
  const project = await projects.getById(projectId);
  if (!project) throw new NotFoundError("PROJECT_NOT_FOUND", "Project not found.");

  const statuses = await new AssetStatusRepository(client).list({
    page: 1,
    limit: 100,
  });

  const { data: assets, error } = await client
    .from("assets")
    .select("asset_status_id, metadata")
    .eq("project_id", projectId)
    .is("deleted_at", null);
  if (error) throw error;

  return summarizeProject(statuses.items, assets ?? [], projectId);
}

// ---------------------------------------------------------------------------
// Dashboard Command Center — Attention + Recent Activity (Phase C)
// Derived from current record state, not audited history (see audit.ts).
// ---------------------------------------------------------------------------

export type AttentionIssue = {
  key: string;
  label: string;
  count: number;
  description: string;
  severity: "warning" | "info";
  actionLabel: string;
  href: string;
  filterHint?: string;
};

export type AttentionData = {
  totalActive: number;
  withoutPhotos: number;
  unplaced: number;
  missingOps: number;
  withoutContacts: number;
  maintenance: number;
  issues: AttentionIssue[];
  propertiesNeedingAttention: Array<{
    id: string;
    name: string;
    code: string | null;
    statusSlug: string | null;
    statusName: string | null;
    issues: string[];
    updatedAt: string;
  }>;
};

export type RecentActivityItem = {
  id: string;
  kind: "property" | "contact" | "document";
  title: string;
  subtitle: string;
  href: string;
  updatedAt: string;
};

export type DashboardData = {
  summary: ProjectSummary;
  attention: AttentionData;
  recentActivity: RecentActivityItem[];
};

function isActiveStatus(slug: string | null | undefined): boolean {
  if (!slug) return false;
  return ["available", "reserved", "occupied", "pending"].includes(slug);
}

export async function buildProjectAttention(
  client: Client,
  projectId: string,
): Promise<AttentionData> {
  const statuses = await new AssetStatusRepository(client).list({ page: 1, limit: 100 });
  const statusById = new Map(statuses.items.map((s) => [s.id, s]));
  const maintenanceIds = new Set(
    statuses.items.filter((s) => s.slug === "maintenance").map((s) => s.id),
  );

  const { data: assets, error } = await client
    .from("assets")
    .select("id, name, code, asset_status_id, metadata, latitude, longitude, updated_at")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(1000);
  if (error) throw error;
  const rows = (assets ?? []) as Array<{
    id: string;
    name: string;
    code: string | null;
    asset_status_id: string | null;
    metadata: unknown;
    latitude: number | null;
    longitude: number | null;
    updated_at: string;
  }>;

  const activeRows = rows.filter((r) => isActiveStatus(statusById.get(r.asset_status_id ?? "")?.slug));

  const assetIds = rows.map((r) => r.id);
  // Batch document counts (image with storage_path)
  const docCounts = new Map<string, number>();
  const contactCounts = new Map<string, number>();
  if (assetIds.length > 0) {
    const { data: docs } = await client
      .from("documents")
      .select("asset_id")
      .in("asset_id", assetIds)
      .eq("category", "image")
      .is("deleted_at", null)
      .not("storage_path", "is", null);
    for (const d of (docs ?? []) as Array<{ asset_id: string }>) {
      docCounts.set(d.asset_id, (docCounts.get(d.asset_id) ?? 0) + 1);
    }
    const { data: pcs } = await client.from("property_contacts").select("asset_id").in("asset_id", assetIds);
    for (const pc of (pcs ?? []) as Array<{ asset_id: string }>) {
      contactCounts.set(pc.asset_id, (contactCounts.get(pc.asset_id) ?? 0) + 1);
    }
  }

  let withoutPhotos = 0;
  let unplaced = 0;
  let missingOps = 0;
  let withoutContacts = 0;
  let maintenance = 0;

  const propertiesNeedingAttention: AttentionData["propertiesNeedingAttention"] = [];

  for (const r of rows) {
    const status = statusById.get(r.asset_status_id ?? "");
    const slug = status?.slug ?? null;
    if (maintenanceIds.has(r.asset_status_id ?? "")) maintenance += 1;
    // Only flag missing data for active properties
    if (!isActiveStatus(slug)) continue;
    const meta =
      r.metadata && typeof r.metadata === "object" ? (r.metadata as Record<string, unknown>) : {};
    const hasPhoto = (docCounts.get(r.id) ?? 0) > 0;
    const isUnplaced = r.latitude == null || r.longitude == null;
    const hasCapacity = meta.capacity != null || meta.pax != null;
    const hasPrice = meta.price != null;
    const hasContact = (contactCounts.get(r.id) ?? 0) > 0;
    // Missing ops = missing capacity or price
    const isMissingOps = !hasCapacity || !hasPrice;

    if (!hasPhoto) withoutPhotos += 1;
    if (isUnplaced) unplaced += 1;
    if (isMissingOps) missingOps += 1;
    if (!hasContact) withoutContacts += 1;
  }

  // Build issues list (only non-zero)
  const issues: AttentionIssue[] = [];
  if (unplaced > 0) {
    issues.push({
      key: "unplaced",
      label: `${unplaced} active ${unplaced === 1 ? "property isn't" : "properties aren't"} placed on the map`,
      count: unplaced,
      description: "Active properties need a map location to appear on the workspace.",
      severity: "warning",
      actionLabel: "View unplaced",
      href: "/dashboard/development?placement=unplaced",
      filterHint: "placement=unplaced",
    });
  }
  if (withoutPhotos > 0) {
    issues.push({
      key: "withoutPhotos",
      label: `${withoutPhotos} active ${withoutPhotos === 1 ? "property has" : "properties have"} no photos`,
      count: withoutPhotos,
      description: "Add photos to showcase these properties.",
      severity: "warning",
      actionLabel: "View properties",
      href: "/dashboard/development",
    });
  }
  if (missingOps > 0) {
    issues.push({
      key: "missingOps",
      label: `${missingOps} ${missingOps === 1 ? "property needs" : "properties need"} operational info`,
      count: missingOps,
      description: "Missing capacity or price — needed for KPIs and commercial view.",
      severity: "info",
      actionLabel: "Review",
      href: "/dashboard/development",
    });
  }
  if (withoutContacts > 0) {
    issues.push({
      key: "withoutContacts",
      label: `${withoutContacts} active ${withoutContacts === 1 ? "property has" : "properties have"} no contacts`,
      count: withoutContacts,
      description: "Link owners or agents to keep property relationships complete.",
      severity: "info",
      actionLabel: "View properties",
      href: "/dashboard/development",
    });
  }
  if (maintenance > 0) {
    issues.push({
      key: "maintenance",
      label: `${maintenance} ${maintenance === 1 ? "property is" : "properties are"} in maintenance`,
      count: maintenance,
      description: "Maintenance properties need attention.",
      severity: "warning",
      actionLabel: "View maintenance",
      href: "/dashboard/development?status=maintenance",
    });
  }

  // Properties needing attention — compact list (max 8, most recent first)
  for (const r of rows.slice(0, 30)) {
    const status = statusById.get(r.asset_status_id ?? "");
    if (!isActiveStatus(status?.slug) && !maintenanceIds.has(r.asset_status_id ?? "")) continue;
    const meta =
      r.metadata && typeof r.metadata === "object" ? (r.metadata as Record<string, unknown>) : {};
    const issuesForAsset: string[] = [];
    if ((docCounts.get(r.id) ?? 0) === 0 && isActiveStatus(status?.slug)) issuesForAsset.push("No photos");
    if ((r.latitude == null || r.longitude == null) && isActiveStatus(status?.slug))
      issuesForAsset.push("Unplaced");
    if ((!meta.capacity && !meta.pax) || !meta.price) {
      if (isActiveStatus(status?.slug)) issuesForAsset.push("Missing ops");
    }
    if ((contactCounts.get(r.id) ?? 0) === 0 && isActiveStatus(status?.slug))
      issuesForAsset.push("No contacts");
    if (maintenanceIds.has(r.asset_status_id ?? "")) issuesForAsset.push("Maintenance");
    if (issuesForAsset.length === 0) continue;
    propertiesNeedingAttention.push({
      id: r.id,
      name: r.name,
      code: r.code,
      statusSlug: status?.slug ?? null,
      statusName: status?.name ?? null,
      issues: issuesForAsset,
      updatedAt: r.updated_at,
    });
    if (propertiesNeedingAttention.length >= 8) break;
  }

  return {
    totalActive: activeRows.length,
    withoutPhotos,
    unplaced,
    missingOps,
    withoutContacts,
    maintenance,
    issues,
    propertiesNeedingAttention,
  };
}

export async function buildProjectRecentActivity(
  client: Client,
  projectId: string,
): Promise<RecentActivityItem[]> {
  const [assetsRes, contactsRes, docsRes] = await Promise.all([
    client
      .from("assets")
      .select("id, name, code, updated_at")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(10),
    client
      .from("contacts")
      .select("id, full_name, updated_at")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(10)
      .then(async (res) => {
        // Filter contacts to those linked to this project's assets via property_contacts
        if (!res.data || res.data.length === 0) return res;
        const { data: links } = await client
          .from("property_contacts")
          .select("contact_id, asset_id")
          .in(
            "asset_id",
            (await client.from("assets").select("id").eq("project_id", projectId).is("deleted_at", null)).data?.map(
              (a) => (a as { id: string }).id,
            ) ?? [],
          );
        const linkedContactIds = new Set((links ?? []).map((l) => (l as { contact_id: string }).contact_id));
        const filtered = (res.data as Array<{ id: string }>).filter((c) => linkedContactIds.has(c.id));
        return { ...res, data: filtered.slice(0, 5) };
      }),
    client
      .from("documents")
      .select("id, name, asset_id, updated_at")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(10)
      .then(async (res) => {
        if (!res.data || res.data.length === 0) return res;
        const assetIds = (await client.from("assets").select("id").eq("project_id", projectId).is("deleted_at", null))
          .data?.map((a) => (a as { id: string }).id) ?? [];
        const filtered = (res.data as Array<{ asset_id: string }>).filter((d) => assetIds.includes(d.asset_id));
        return { ...res, data: filtered.slice(0, 5) };
      }),
  ]);

  const items: RecentActivityItem[] = [];
  for (const a of (assetsRes.data ?? []) as Array<{ id: string; name: string; code: string | null; updated_at: string }>) {
    items.push({
      id: a.id,
      kind: "property",
      title: a.name,
      subtitle: a.code ? `${a.code}` : "Property updated",
      href: `/dashboard/properties/${a.id}`,
      updatedAt: a.updated_at,
    });
  }
  for (const c of (contactsRes.data ?? []) as Array<{ id: string; full_name: string; updated_at: string }>) {
    items.push({
      id: c.id,
      kind: "contact",
      title: c.full_name,
      subtitle: "Contact",
      href: `/dashboard/contacts/${c.id}`,
      updatedAt: c.updated_at,
    });
  }
  for (const d of (docsRes.data ?? []) as Array<{ id: string; name: string; updated_at: string; asset_id: string }>) {
    items.push({
      id: d.id,
      kind: "document",
      title: d.name,
      subtitle: "Document",
      href: `/dashboard/properties/${d.asset_id}`,
      updatedAt: d.updated_at,
    });
  }
  items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return items.slice(0, 8);
}

export async function buildProjectDashboardData(
  client: Client,
  projectId: string,
): Promise<DashboardData> {
  const [summary, attention, recentActivity] = await Promise.all([
    buildProjectSummary(client, projectId),
    buildProjectAttention(client, projectId),
    buildProjectRecentActivity(client, projectId),
  ]);
  return { summary, attention, recentActivity };
}
