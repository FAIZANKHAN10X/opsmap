import "server-only";

import type { Client } from "@/lib/server/repositories/base";
import { ReportStorage } from "@/lib/server/storage";
import { ALLOWED_REPORT_TYPES } from "@/lib/server/constants";
import { ValidationAppError } from "@/lib/server/errors";
import { audit } from "@/lib/server/audit";

export type ReportGenerateInput = {
  report_type?: string;
  project_id?: string | null;
};

export type ProjectSummaryResult = {
  status: "ok";
  report_type: "project_summary";
  project_id: string;
  path: string;
  generated_at: string;
  summary: {
    asset_count: number;
    document_count: number;
    assets_by_status: Record<string, number>;
    assets_by_type: Record<string, number>;
  };
};

export type ReportResult =
  | ProjectSummaryResult
  | { status: "failed"; reason: string };

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function stamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/**
 * generate_report equivalent. Phase 9 ran report assembly in an RQ worker;
 * here generation is synchronous server-side and the JSON summary is written
 * to the `reports` storage bucket. Project reads run on the authenticated
 * client so RLS applies.
 */
export async function generateReport(
  client: Client,
  opts: ReportGenerateInput,
): Promise<ReportResult> {
  const reportType = (opts.report_type ?? "").trim().toLowerCase();
  if (!ALLOWED_REPORT_TYPES.has(reportType)) {
    throw new ValidationAppError(
      `report_type must be one of: ${[...ALLOWED_REPORT_TYPES].sort().join(", ")}`,
      [
        {
          field: "report_type",
          message: `report_type must be one of: ${[...ALLOWED_REPORT_TYPES].sort().join(", ")}`,
        },
      ],
    );
  }

  if (reportType === "project_summary") {
    if (!opts.project_id) {
      return { status: "failed", reason: "project_id_required" };
    }
    if (!isUuid(opts.project_id)) {
      return { status: "failed", reason: "invalid_project_id" };
    }
    return generateProjectSummary(client, opts.project_id);
  }

  return { status: "failed", reason: "unhandled_report_type" };
}

async function generateProjectSummary(
  client: Client,
  projectId: string,
): Promise<ReportResult> {
  const { data: project, error: projectError } = await client
    .from("projects")
    .select("id, name, slug, status")
    .eq("id", projectId)
    .is("deleted_at", null)
    .maybeSingle();
  if (projectError) throw projectError;
  if (!project) return { status: "failed", reason: "project_not_found" };

  const assetCountQuery = client
    .from("assets")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .is("deleted_at", null);
  const { count: assetCount } = await assetCountQuery;

  const assets = await client
    .from("assets")
    .select("id, asset_status_id, asset_type_id")
    .eq("project_id", projectId)
    .is("deleted_at", null);

  const { data: statuses } = await client
    .from("asset_statuses")
    .select("id, name")
    .is("deleted_at", null);
  const statusNameById = new Map((statuses ?? []).map((s) => [s.id, s.name]));

  const { data: types } = await client
    .from("asset_types")
    .select("id, name")
    .is("deleted_at", null);
  const typeNameById = new Map((types ?? []).map((t) => [t.id, t.name]));

  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  for (const asset of assets.data ?? []) {
    const statusName = asset.asset_status_id
      ? (statusNameById.get(asset.asset_status_id) ?? "Unassigned")
      : "Unassigned";
    byStatus[statusName] = (byStatus[statusName] ?? 0) + 1;

    const typeName = asset.asset_type_id
      ? (typeNameById.get(asset.asset_type_id) ?? "Unassigned")
      : "Unassigned";
    byType[typeName] = (byType[typeName] ?? 0) + 1;
  }

  const { data: projectAssets } = await client
    .from("assets")
    .select("id")
    .eq("project_id", projectId)
    .is("deleted_at", null);
  const projectAssetIds = (projectAssets ?? []).map((a) => a.id);

  let documentCount = 0;
  if (projectAssetIds.length > 0) {
    const docQuery = client
      .from("documents")
      .select("id", { count: "exact", head: true })
      .in("asset_id", projectAssetIds)
      .is("deleted_at", null);
    const { count } = await docQuery;
    documentCount = count ?? 0;
  }

  const generatedAt = new Date().toISOString();
  const payload = {
    report_type: "project_summary",
    generated_at: generatedAt,
    project: {
      id: project.id,
      name: project.name,
      slug: project.slug,
      status: project.status,
    },
    summary: {
      asset_count: assetCount ?? 0,
      document_count: documentCount,
      assets_by_status: byStatus,
      assets_by_type: byType,
    },
  };

  const filename = `project_summary_${project.slug}_${stamp()}.json`;
  const relative = `reports/${filename}`;
  const storage = new ReportStorage();
  await storage.save(relative, new TextEncoder().encode(JSON.stringify(payload, null, 2)), "application/json");

  audit("report.generated", { report_type: "project_summary", project_id: projectId, path: relative });

  return {
    status: "ok",
    report_type: "project_summary",
    project_id: projectId,
    path: relative,
    generated_at: generatedAt,
    summary: payload.summary,
  };
}