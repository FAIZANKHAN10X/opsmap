import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createFakeClient } from "../helpers/fakeClient";
import { buildProjectSummary } from "@/lib/server/services/dashboard";
import { NotFoundError } from "@/lib/server/errors";

const PROJECT = "123e4567-e89b-12d3-a456-426614174000";
const AVAILABLE = "223e4567-e89b-12d3-a456-426614174001";
const RESERVED = "323e4567-e89b-12d3-a456-426614174002";

describe("buildProjectSummary", () => {
  it("throws PROJECT_NOT_FOUND for missing projects", async () => {
    const client = createFakeClient({ projects: [], asset_statuses: [], assets: [] });
    await expect(buildProjectSummary(client, PROJECT)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("counts assets per status for a project", async () => {
    const client = createFakeClient({
      projects: [{ id: PROJECT, name: "Main", slug: "main", deleted_at: null }],
      asset_statuses: [
        { id: AVAILABLE, slug: "available", name: "Available", color: "#22c55e", deleted_at: null },
        { id: RESERVED, slug: "reserved", name: "Reserved", color: "#38bdf8", deleted_at: null },
      ],
      assets: [
        { id: "a1", project_id: PROJECT, asset_status_id: AVAILABLE, deleted_at: null },
        { id: "a2", project_id: PROJECT, asset_status_id: AVAILABLE, deleted_at: null },
        { id: "a3", project_id: PROJECT, asset_status_id: RESERVED, deleted_at: null },
        { id: "a4", project_id: PROJECT, asset_status_id: null, deleted_at: null },
        { id: "a5", project_id: "other", asset_status_id: AVAILABLE, deleted_at: null },
      ],
    });
    const summary = await buildProjectSummary(client, PROJECT);
    expect(summary.total_assets).toBe(4);
    expect(summary.by_status).toEqual([
      { status_id: AVAILABLE, status_slug: "available", status_name: "Available", color: "#22c55e", count: 2 },
      { status_id: RESERVED, status_slug: "reserved", status_name: "Reserved", color: "#38bdf8", count: 1 },
    ]);
  });

  it("includes all statuses with zero counts only when the project has no assets", async () => {
    const client = createFakeClient({
      projects: [{ id: PROJECT, name: "Main", slug: "main", deleted_at: null }],
      asset_statuses: [
        { id: AVAILABLE, slug: "available", name: "Available", color: "#22c55e", deleted_at: null },
        { id: RESERVED, slug: "reserved", name: "Reserved", color: "#38bdf8", deleted_at: null },
      ],
      assets: [],
    });
    const summary = await buildProjectSummary(client, PROJECT);
    expect(summary.total_assets).toBe(0);
    expect(summary.by_status.map((s) => s.status_slug)).toEqual(["available", "reserved"]);
    expect(summary.by_status.every((s) => s.count === 0)).toBe(true);
  });
});