import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({
  isSupabaseConfigured: () => true,
}));

const { ctx } = vi.hoisted(() => ({
  ctx: { client: null as unknown, admin: null as unknown },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ctx.client,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ctx.admin,
}));

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

import { createFakeClientFromStore, createSharedStore } from "../helpers/fakeClient";
import { TEST_USER_ID, adminAuthUser, adminProfile } from "../helpers/auth";
import { generateProjectSummaryReport } from "@/actions/reports";

const PROJECT = "123e4567-e89b-12d3-a456-426614174000";
const STATUS = "223e4567-e89b-12d3-a456-426614174001";

function makeContext(tables: Record<string, unknown[]>) {
  const store = createSharedStore({
    ...tables,
    profiles: [...(tables.profiles ?? []), adminProfile],
  } as never);
  ctx.client = createFakeClientFromStore(store, { user: adminAuthUser });
  ctx.admin = createFakeClientFromStore(store, { user: adminAuthUser });
  return store;
}

const BASE = {
  projects: [{ id: PROJECT, name: "Main", slug: "main", status: "active", deleted_at: null }],
  asset_statuses: [
    { id: STATUS, name: "Available", slug: "available", color: "#22c55e", deleted_at: null },
  ],
  asset_types: [],
  assets: [
    { id: "a1", project_id: PROJECT, asset_status_id: STATUS, asset_type_id: null, deleted_at: null },
    { id: "a2", project_id: PROJECT, asset_status_id: null, asset_type_id: null, deleted_at: null },
  ],
  documents: [{ id: "d1", asset_id: "a1", deleted_at: null }],
};

describe("report actions", () => {
  it("generateProjectSummaryReport returns a success envelope with by_status rows", async () => {
    reportSaves.length = 0;
    makeContext(BASE);
    const res = await generateProjectSummaryReport({
      report_type: "project_summary",
      project_id: PROJECT,
    });
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.project_id).toBe(PROJECT);
    expect(res.data.total_assets).toBe(2);
    expect(res.data.document_count).toBe(1);
    expect(res.data.by_status).toHaveLength(2);
    expect(res.data.by_status[0]).toMatchObject({ status_slug: "available", count: 1, color: "#22c55e" });
    expect(res.data.by_status[1]).toMatchObject({ status_name: "Unassigned", count: 1 });
    expect(reportSaves).toHaveLength(1);
  });

  it("maps a missing project to the error envelope", async () => {
    makeContext({ ...BASE, projects: [] });
    const res = await generateProjectSummaryReport({
      report_type: "project_summary",
      project_id: PROJECT,
    });
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error.code).toBe("PROJECT_NOT_FOUND");
  });

  it("maps an unknown report type to the error envelope", async () => {
    makeContext(BASE);
    const res = await generateProjectSummaryReport({ report_type: "bogus" });
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects viewers from generating reports (storage write)", async () => {
    reportSaves.length = 0;
    const store = createSharedStore({
      ...BASE,
      profiles: [
        {
          id: TEST_USER_ID,
          email: "viewer@opsmap.app",
          full_name: null,
          role: "viewer",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
    } as never);
    ctx.client = createFakeClientFromStore(store, {
      user: { id: TEST_USER_ID, email: "viewer@opsmap.app", user_metadata: {} },
    });
    ctx.admin = ctx.client;
    const res = await generateProjectSummaryReport({
      report_type: "project_summary",
      project_id: PROJECT,
    });
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error.code).toBe("FORBIDDEN");
    expect(reportSaves).toHaveLength(0);
  });
});