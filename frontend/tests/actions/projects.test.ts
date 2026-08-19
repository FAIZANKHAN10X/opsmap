import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { revalidatePath } from "next/cache";

import { createFakeClientFromStore, createSharedStore } from "../helpers/fakeClient";
import { TEST_USER_ID, adminAuthUser, adminProfile } from "../helpers/auth";
import { createProject, deleteProject, listProjects, updateProject } from "@/actions/projects";
import type { UserRole } from "@/types/domain";

function makeContext(tables: Record<string, unknown[]>) {
  const store = createSharedStore({
    ...tables,
    profiles: [...(tables.profiles ?? []), adminProfile],
  } as never);
  ctx.client = createFakeClientFromStore(store, { user: adminAuthUser });
  ctx.admin = createFakeClientFromStore(store, { user: adminAuthUser });
  return store;
}

function makeRoleContext(role: UserRole) {
  const store = createSharedStore({
    profiles: [
      {
        id: TEST_USER_ID,
        email: "user@opsmap.app",
        full_name: null,
        role,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ],
    projects: [{ ...PROJECT }],
  } as never);
  const user = { id: TEST_USER_ID, email: "user@opsmap.app", user_metadata: {} };
  ctx.client = createFakeClientFromStore(store, { user });
  ctx.admin = createFakeClientFromStore(store, { user });
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
  beforeEach(() => {
    vi.mocked(revalidatePath).mockClear();
  });

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

  it("createProject revalidates the dashboard routes on success", async () => {
    makeContext({ projects: [] });
    const res = await createProject({ name: "North Site", slug: "North Site" });
    expect(res.success).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/projects");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/development");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("failed createProject does not revalidate routes", async () => {
    makeContext({ projects: [{ ...PROJECT }] });
    const res = await createProject({ name: "Other", slug: "north-site" });
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error.code).toBe("PROJECT_SLUG_EXISTS");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("updateProject revalidates dashboard routes on success", async () => {
    makeContext({ projects: [{ ...PROJECT }] });
    const res = await updateProject(PROJECT.id, { name: "North Site Renamed" });
    expect(res.success).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/projects");
  });

  it("deleteProject revalidates dashboard routes on success", async () => {
    makeContext({ projects: [{ ...PROJECT }] });
    const res = await deleteProject(PROJECT.id);
    expect(res).toEqual({ success: true, data: null, message: null });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/projects");
  });

  it("archive is the existing status field and drops from the active list", async () => {
    makeContext({ projects: [{ ...PROJECT }] });
    const res = await updateProject(PROJECT.id, { status: "archived" });
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.status).toBe("archived");

    const active = await listProjects({ page: 1, limit: 10, status: "active" });
    expect(active.success).toBe(true);
    if (active.success) expect(active.data).toHaveLength(0);

    const all = await listProjects({ page: 1, limit: 10 });
    expect(all.success).toBe(true);
    if (all.success) {
      expect(all.data.map((p) => p.slug)).toContain("north-site");
    }
  });

  it("viewers and operators are forbidden from creating, renaming, archiving, or deleting developments", async () => {
    for (const role of ["viewer", "operator"] as const) {
      makeRoleContext(role);
      const created = await createProject({ name: "Other", slug: "other-site" });
      expect(created.success).toBe(false);
      if (created.success) return;
      expect(created.error.code).toBe("FORBIDDEN");

      expect((await updateProject(PROJECT.id, { name: "Renamed" })).success).toBe(false);
      expect((await updateProject(PROJECT.id, { status: "archived" })).success).toBe(false);
      expect((await deleteProject(PROJECT.id)).success).toBe(false);
      expect(revalidatePath).not.toHaveBeenCalled();
    }
  });
});