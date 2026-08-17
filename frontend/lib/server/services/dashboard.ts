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
