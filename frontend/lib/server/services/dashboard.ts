import "server-only";

import type { Client } from "@/lib/server/repositories/base";
import { NotFoundError } from "@/lib/server/errors";
import { ProjectRepository } from "@/lib/server/repositories/projects";
import { AssetStatusRepository } from "@/lib/server/repositories/asset-statuses";
import type { ProjectSummary, StatusCount } from "@/types/domain";

/**
 * Dashboard aggregation. Mirrors the mock buildProjectSummary: per-status
 * counts for a project (statuses with zero assets are included only when the
 * project has no assets at all), ordered by status sort_order.
 */
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
    .select("asset_status_id")
    .eq("project_id", projectId)
    .is("deleted_at", null);
  if (error) throw error;

  const total = (assets ?? []).length;
  const counts = new Map<string, number>();
  for (const asset of assets ?? []) {
    if (asset.asset_status_id) {
      counts.set(asset.asset_status_id, (counts.get(asset.asset_status_id) ?? 0) + 1);
    }
  }

  const by_status: StatusCount[] = statuses.items
    .filter((s) => total === 0 || (counts.get(s.id) ?? 0) > 0)
    .map((s) => ({
      status_id: s.id,
      status_slug: s.slug,
      status_name: s.name,
      color: s.color ?? "#64748b",
      count: counts.get(s.id) ?? 0,
    }));

  return { project_id: projectId, total_assets: total, by_status };
}