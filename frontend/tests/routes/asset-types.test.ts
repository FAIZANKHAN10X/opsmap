import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/env", () => ({
  isSupabaseConfigured: vi.fn(() => true),
}));

const { ctx } = vi.hoisted(() => ({
  ctx: { client: null as unknown, admin: null as unknown },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ctx.client,
}));

vi.mock("@/lib/server/action-context", () => ({
  withServerContext: () => Promise.resolve({ client: ctx.client as never, admin: ctx.admin as never, actor: { id: "test-admin", email: "admin@test", fullName: null, role: "admin" as const } }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ctx.admin,
}));

import { createFakeClientFromStore, createSharedStore } from "../helpers/fakeClient";
import {
  DELETE,
  GET,
  PATCH,
  POST,
  PUT,
} from "@/app/api/asset-types/seed-defaults/route";
import { isSupabaseConfigured } from "@/lib/env";

const mockedConfigured = vi.mocked(isSupabaseConfigured);

function makeContext(types: Record<string, unknown>[]) {
  const store = createSharedStore({ asset_types: types } as never);
  ctx.client = createFakeClientFromStore(store);
  ctx.admin = createFakeClientFromStore(store);
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/asset-types/seed-defaults", () => {
  it("seeds missing defaults and returns the full active list", async () => {
    makeContext([]);
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.pagination.total).toBeGreaterThanOrEqual(1);
    const slugs = new Set(body.data.map((t: { slug: string }) => t.slug));
    expect(slugs.has("villa")).toBe(true);
  });

  it("is idempotent — reseeding does not duplicate rows", async () => {
    makeContext([]);
    await POST();
    const res = await POST();
    const body = await res.json();
    const slugs = body.data.map((t: { slug: string }) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("keeps existing types untouched (no duplicates, no overwrites)", async () => {
    const existing = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      name: "Apartment",
      slug: "apartment",
      description: null,
      sort_order: 2,
      deleted_at: null,
    };
    makeContext([existing]);
    const res = await POST();
    const body = await res.json();
    const slugs = body.data.map((t: { slug: string }) => t.slug);
    expect(slugs).toContain("apartment");
    expect(slugs).toContain("villa");
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("returns 503 when Supabase is not configured", async () => {
    mockedConfigured.mockReturnValue(false);
    makeContext([]);
    const res = await POST();
    expect(res.status).toBe(503);
  });

  it("rejects GET/PUT/PATCH/DELETE with 405", async () => {
    makeContext([]);
    for (const handler of [GET, PUT, PATCH, DELETE]) {
      const res = await handler();
      expect(res.status).toBe(405);
    }
  });
});