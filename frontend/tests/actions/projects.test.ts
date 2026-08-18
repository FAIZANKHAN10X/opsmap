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

import { createFakeClientFromStore, createSharedStore } from "../helpers/fakeClient";
import { adminAuthUser, adminProfile } from "../helpers/auth";
import { createProject, deleteProject, listProjects, updateProject } from "@/actions/projects";

function makeContext(tables: Record<string, unknown[]>) {
  const store = createSharedStore({
    ...tables,
    profiles: [...(tables.profiles ?? []), adminProfile],
  } as never);
  ctx.client = createFakeClientFromStore(store, { user: adminAuthUser });
  ctx.admin = createFakeClientFromStore(store, { user: adminAuthUser });
  return store;
}

const PROJECT = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  name: "North Site",
  slug: "north-site",
  description: null,
  status: "active",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  deleted_at: null,
};

describe("project actions", () => {
  it("createProject returns a success envelope with the mapped project", async () => {
    makeContext({ projects: [] });
    const res = await createProject({ name: "North Site", slug: "North Site" });
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.name).toBe("North Site");
    expect(res.data.slug).toBe("north-site");
    expect(res.data.status).toBe("active");
  });

  it("createProject maps validation failures to the error envelope", async () => {
    makeContext({ projects: [] });
    const res = await createProject({ name: "", slug: "Bad Slug!!" });
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error.code).toBe("VALIDATION_ERROR");
    expect(res.error.fields).toBeDefined();
  });

  it("createProject maps slug conflicts to the error envelope", async () => {
    makeContext({ projects: [{ ...PROJECT }] });
    const res = await createProject({ name: "Other", slug: "north-site" });
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error.code).toBe("PROJECT_SLUG_EXISTS");
  });

  it("listProjects paginates and reports totals", async () => {
    const projects = Array.from({ length: 3 }, (_, i) => ({
      ...PROJECT,
      id: `id-${i}`,
      slug: `site-${i}`,
    }));
    makeContext({ projects });
    const res = await listProjects({ page: 1, limit: 2 });
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data).toHaveLength(2);
    expect(res.pagination.total).toBe(3);
    expect(res.pagination.pages).toBe(2);
    expect(res.message).toBeNull();
  });

  it("updateProject persists changes through the action", async () => {
    makeContext({ projects: [{ ...PROJECT }] });
    const res = await updateProject(PROJECT.id, { name: "North Site Renamed" });
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.name).toBe("North Site Renamed");
  });

  it("deleteProject resolves with null data on success", async () => {
    makeContext({ projects: [{ ...PROJECT }] });
    const res = await deleteProject(PROJECT.id);
    expect(res).toEqual({ success: true, data: null, message: null });
  });

  it("deleteProject maps missing projects to the error envelope", async () => {
    makeContext({ projects: [] });
    const res = await deleteProject(PROJECT.id);
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error.code).toBe("PROJECT_NOT_FOUND");
  });
});