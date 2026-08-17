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
} from "@/app/api/asset-statuses/seed-defaults/route";
import { isSupabaseConfigured } from "@/lib/env";

const mockedConfigured = vi.mocked(isSupabaseConfigured);

function makeContext(statuses: Record<string, unknown>[]) {
  const store = createSharedStore({ asset_statuses: statuses } as never);
  ctx.client = createFakeClientFromStore(store);
  ctx.admin = createFakeClientFromStore(store);
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/asset-statuses/seed-defaults", () => {
  it("seeds missing defaults and returns the full active list", async () => {
    makeContext([]);
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.pagination.total).toBeGreaterThanOrEqual(6);
    const slugs = new Set(body.data.map((s: { slug: string }) => s.slug));
    for (const expected of ["available", "reserved", "sold", "maintenance", "pending", "offline"]) {
      expect(slugs.has(expected)).toBe(true);
    }
    for (const row of body.data) {
      expect(row.color).toMatch(/^#/);
    }
  });

  it("is idempotent — reseeding does not duplicate rows", async () => {
    makeContext([]);
    await POST();
    const res = await POST();
    const body = await res.json();
    const slugs = body.data.map((s: { slug: string }) => s.slug);
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