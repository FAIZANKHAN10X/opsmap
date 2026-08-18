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
import { TEST_USER_ID } from "../helpers/auth";
import { createAsset, deleteAsset } from "@/actions/assets";
import { createProject, listProjects } from "@/actions/projects";
import { setUserRole } from "@/actions/profiles";
import type { UserRole } from "@/types/domain";

const PROJECT = "123e4567-e89b-12d3-a456-426614174000";
const TYPE = "223e4567-e89b-12d3-a456-426614174001";
const STATUS = "323e4567-e89b-12d3-a456-426614174002";

function makeContext(role: UserRole, extra: Record<string, unknown[]> = {}) {
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
    projects: [],
    asset_types: [
      { id: TYPE, name: "Villa", slug: "villa", deleted_at: null },
    ],
    asset_statuses: [
      {
        id: STATUS,
        name: "Available",
        slug: "available",
        color: "#22c55e",
        deleted_at: null,
      },
    ],
    assets: [],
    documents: [],
    notifications: [],
    ...extra,
  } as never);
  const user = { id: TEST_USER_ID, email: "user@opsmap.app", user_metadata: {} };
  ctx.client = createFakeClientFromStore(store, { user });
  ctx.admin = createFakeClientFromStore(store, { user });
  return store;
}

describe("role gates (Phase 14)", () => {
  it("viewers can read but are forbidden from creating projects", async () => {
    const store = makeContext("viewer");
    const res = await createProject({ name: "North", slug: "North" });
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error.code).toBe("FORBIDDEN");

    const list = await listProjects({ page: 1, limit: 10 });
    expect(list.success).toBe(true);
    expect((store.get("projects") ?? []).length).toBe(0);
  });

  it("operators can create assets but not delete them", async () => {
    makeContext("operator", {
      projects: [
        { id: PROJECT, name: "Site", slug: "site", status: "active", deleted_at: null },
      ],
    });
    const created = await createAsset({
      project_id: PROJECT,
      name: "Laptop 1",
      asset_type_id: TYPE,
      asset_status_id: STATUS,
    });
    expect(created.success).toBe(true);

    const deleted = await deleteAsset("some-asset");
    expect(deleted.success).toBe(false);
    if (deleted.success) return;
    expect(deleted.error.code).toBe("FORBIDDEN");
  });

  it("admins can change a user's role through setUserRole", async () => {
    const store = makeContext("admin", {
      profiles: [
        {
          id: TEST_USER_ID,
          email: "user@opsmap.app",
          full_name: null,
          role: "admin",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
        {
          id: "99999999-9999-4999-8999-999999999999",
          email: "other@opsmap.app",
          full_name: null,
          role: "operator",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
    });
    const res = await setUserRole({
      target_user_id: "99999999-9999-4999-8999-999999999999",
      role: "manager",
    });
    expect(res.success).toBe(true);
    const profiles = store.get("profiles") ?? [];
    const updated = profiles.find(
      (p) => p.id === "99999999-9999-4999-8999-999999999999",
    );
    expect(updated?.role).toBe("manager");
  });

  it("non-admins cannot change roles", async () => {
    makeContext("manager");
    const res = await setUserRole({
      target_user_id: TEST_USER_ID,
      role: "admin",
    });
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error.code).toBe("FORBIDDEN");
  });

  it("setUserRole fails for unknown users", async () => {
    makeContext("admin");
    const res = await setUserRole({
      target_user_id: "missing",
      role: "viewer",
    });
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error.code).toBe("PROFILE_NOT_FOUND");
  });

  it("createProject stamps created_by and updated_by from the actor", async () => {
    const store = makeContext("admin");
    const res = await createProject({ name: "North", slug: "North" });
    expect(res.success).toBe(true);
    const row = (store.get("projects") ?? [])[0];
    expect(row?.created_by).toBe(TEST_USER_ID);
    expect(row?.updated_by).toBe(TEST_USER_ID);
  });
});