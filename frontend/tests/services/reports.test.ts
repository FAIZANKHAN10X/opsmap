import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { reportSaves } = vi.hoisted(() => ({
  reportSaves: [] as Array<{ path: string; contentType: string }>,
}));

vi.mock("@/lib/server/storage", () => ({
  ReportStorage: class {
    async save(path: string, data: Uint8Array, contentType: string) {
      reportSaves.push({ path, contentType });
      return data.length;
    }
  },
}));

import { createFakeClient } from "../helpers/fakeClient";
import { generateReport } from "@/lib/server/services/reports";
import { ValidationAppError } from "@/lib/server/errors";

const PROJECT = "123e4567-e89b-12d3-a456-426614174000";
const STATUS = "223e4567-e89b-12d3-a456-426614174001";
const TYPE = "323e4567-e89b-12d3-a456-426614174002";

function makeClient() {
  return createFakeClient({
    projects: [{ id: PROJECT, name: "Main", slug: "main", status: "active", deleted_at: null }],
    asset_statuses: [
      { id: STATUS, name: "Available", slug: "available", color: "#22c55e", deleted_at: null },
    ],
    asset_types: [{ id: TYPE, name: "Laptop", slug: "laptop", deleted_at: null }],
    assets: [
      { id: "a1", project_id: PROJECT, asset_status_id: STATUS, asset_type_id: null, deleted_at: null },
      { id: "a2", project_id: PROJECT, asset_status_id: STATUS, asset_type_id: TYPE, deleted_at: null },
      { id: "a3", project_id: PROJECT, asset_status_id: null, asset_type_id: null, deleted_at: null },
      { id: "a4", project_id: "other-project", asset_status_id: null, asset_type_id: null, deleted_at: null },
    ],
    documents: [
      { id: "d1", asset_id: "a1", deleted_at: null },
      { id: "d2", asset_id: "a1", deleted_at: null },
      { id: "d3", asset_id: "a2", deleted_at: null },
    ],
  });
}

describe("generateReport (synchronous)", () => {
  it("rejects unknown report types", async () => {
    const client = makeClient();
    const err = await generateReport(client, { report_type: "bogus" }).catch((e) => e);
    expect(err).toBeInstanceOf(ValidationAppError);
    expect(err.fields[0].field).toBe("report_type");
  });

  it("fails without a project id for project_summary", async () => {
    const client = makeClient();
    const result = await generateReport(client, { report_type: "project_summary" });
    expect(result).toEqual({ status: "failed", reason: "project_id_required" });
  });

  it("fails on malformed project ids", async () => {
    const client = makeClient();
    const result = await generateReport(client, {
      report_type: "project_summary",
      project_id: "nope",
    });
    expect(result).toEqual({ status: "failed", reason: "invalid_project_id" });
  });

  it("fails when the project is missing", async () => {
    const client = makeClient();
    const result = await generateReport(client, {
      report_type: "project_summary",
      project_id: "99999999-0000-0000-0000-000000000000",
    });
    expect(result).toEqual({ status: "failed", reason: "project_not_found" });
  });

  it("aggregates the project summary synchronously and writes JSON to storage", async () => {
    reportSaves.length = 0;
    const client = makeClient();
    const result = await generateReport(client, {
      report_type: "project_summary",
      project_id: PROJECT,
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.report_type).toBe("project_summary");
    expect(result.project_id).toBe(PROJECT);
    expect(result.path).toMatch(/^reports\/project_summary_main_.+\.json$/);
    expect(result.summary.asset_count).toBe(3);
    expect(result.summary.document_count).toBe(3);
    expect(result.summary.assets_by_status).toEqual({ Available: 2, Unassigned: 1 });
    expect(result.summary.assets_by_type).toEqual({ Unassigned: 2, Laptop: 1 });

    expect(reportSaves).toHaveLength(1);
    expect(reportSaves[0].contentType).toBe("application/json");
  });
});