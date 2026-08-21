import { describe, expect, it, vi } from "vitest";

/**
 * Local "journey" tests — drive the real Server Action + service + repository
 * stack end to end with in-memory fakes for Supabase and storage. These verify
 * wiring and contract shape locally; real RLS / Supabase behaviour is
 * runtime-only with a provisioned project.
 */

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({
  isSupabaseConfigured: () => true,
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
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

vi.mock("@/lib/server/services/images", () => ({
  processDocumentImage: vi.fn(() => Promise.resolve({ status: "skipped" })),
}));

vi.mock("@/lib/server/storage", () => {
  return {
    safeFilename: (name: string) => name.split("/").pop()?.replace(/[^\w.\-()+ ]+/g, "_") ?? "file",
    SupabaseStorage: class {
      buildRelativePath() {
        return "assets/x/documents/journey.pdf";
      }
      async save(_path: string, data: { byteLength: number }) {
        return data.byteLength;
      }
      async read() {
        return new Uint8Array([1, 2, 3]);
      }
      async delete() {
        return undefined;
      }
    },
    ReportStorage: class {
      async save() {
        return 0;
      }
    },
  };
});

import { createFakeClientFromStore, createSharedStore } from "../helpers/fakeClient";
import { adminAuthUser, adminProfile } from "../helpers/auth";
import { createProject } from "@/actions/projects";
import { createAssetType } from "@/actions/asset-types";
import { createAssetStatus } from "@/actions/asset-statuses";
import { createAsset } from "@/actions/assets";
import { uploadDocument, listDocumentsForAsset } from "@/actions/documents";
import { createNotification, listNotifications } from "@/actions/notifications";
import { generateProjectSummaryReport } from "@/actions/reports";

describe("project → asset → document → notification → report journey", () => {
  it("runs a full asset lifecycle through the action stack", async () => {
    const store = createSharedStore({
      profiles: [adminProfile],
      projects: [],
      asset_types: [],
      asset_statuses: [],
      assets: [],
      documents: [],
      notifications: [],
    } as never);
    ctx.client = createFakeClientFromStore(store, { user: adminAuthUser });
    ctx.admin = createFakeClientFromStore(store, { user: adminAuthUser });

    const project = await createProject({ name: "Seaside Estate", slug: "seaside-estate" });
    expect(project.success).toBe(true);
    if (!project.success) throw new Error(project.error.message);
    const projectId = project.data.id;

    const type = await createAssetType({ name: "Villa", slug: "villa" });
    expect(type.success).toBe(true);
    if (!type.success) throw new Error(type.error.message);

    const status = await createAssetStatus({ name: "Available", slug: "available", color: "#22c55e" });
    expect(status.success).toBe(true);
    if (!status.success) throw new Error(status.error.message);

    const asset = await createAsset({
      project_id: projectId,
      name: "Villa A1",
      code: "A1",
      asset_type_id: type.data.id,
      asset_status_id: status.data.id,
      metadata: { bedrooms: 4 },
    });
    expect(asset.success).toBe(true);
    if (!asset.success) throw new Error(asset.error.message);
    expect(asset.data.assignees).toEqual([]);

    const form = new FormData();
    form.append("asset_id", asset.data.id);
    form.append("name", "Purchase agreement");
    form.append("category", "contract");
    form.append("file", new File(["%PDF"], "agreement.pdf", { type: "application/pdf" }));
    const doc = await uploadDocument(form);
    expect(doc.success).toBe(true);
    if (!doc.success) throw new Error(doc.error.message);
    expect(doc.data.has_file).toBe(true);
    expect(doc.data.is_previewable).toBe(true);

    const docs = await listDocumentsForAsset(asset.data.id, { page: 1, limit: 10 });
    expect(docs.success).toBe(true);
    if (!docs.success) throw new Error("expected document listing to succeed");
    expect(docs.pagination.total).toBe(1);

    const notification = await createNotification({
      severity: "info",
      kind: "assignment",
      title: "Assigned",
      message: "Villa A1 assigned to you.",
      recipient_email: "ops@example.com",
    });
    expect(notification.success).toBe(true);
    if (!notification.success) throw new Error(notification.error.message);

    const notes = await listNotifications({ page: 1, limit: 10 });
    expect(notes.success).toBe(true);
    if (!notes.success) throw new Error("expected notification listing to succeed");
    expect(notes.data.length).toBe(1);
    expect(notes.data[0].kind).toBe("assignment");

    const report = await generateProjectSummaryReport({
      report_type: "project_summary",
      project_id: projectId,
    });
    expect(report.success).toBe(true);
    if (!report.success) throw new Error(report.error.message);
    expect(report.data.total_assets).toBe(1);
    expect(report.data.document_count).toBe(1);
    expect(report.data.by_status.find((r) => r.status_slug === "available")?.count).toBe(1);
  });
});