"use server";

import type { ProjectSummary } from "@/types/domain";

import { runAction, withServerContext } from "@/lib/server/action-context";
import { generateReport, type ReportGenerateInput } from "@/lib/server/services/reports";
import { NotFoundError, ValidationAppError } from "@/lib/server/errors";

export type GenerateReportInput = ReportGenerateInput;

export async function generateProjectSummaryReport(input: GenerateReportInput) {
  return runAction<ProjectSummary>(async () => {
    const { client } = await withServerContext();
    const result = await generateReport(client, input);

    if (result.status === "failed") {
      if (result.reason === "project_not_found") {
        throw new NotFoundError("PROJECT_NOT_FOUND", "Project not found.");
      }
      throw new ValidationAppError("Report generation failed.", [
        { field: "report_type", message: `Report generation failed: ${result.reason}.` },
      ]);
    }

    const summary = result.summary;

    const { data: statusRows } = await client
      .from("asset_statuses")
      .select("id, slug, name, color")
      .is("deleted_at", null);
    const statusByName = new Map((statusRows ?? []).map((s) => [s.name, s]));

    const byStatus = Object.entries(summary.assets_by_status).map(
      ([name, count]) => {
        const status = statusByName.get(name);
        return {
          status_id: status?.id ?? "",
          status_slug:
            status?.slug ?? name.toLowerCase().replace(/\s+/g, "-"),
          status_name: name,
          color: status?.color ?? "#6b7380",
          count,
        };
      },
    );

    return {
      project_id: result.project_id,
      total_assets: summary.asset_count,
      document_count: summary.document_count,
      by_status: byStatus,
    };
  });
}