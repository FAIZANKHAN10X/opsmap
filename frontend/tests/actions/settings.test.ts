import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { env } = vi.hoisted(() => ({
  env: {
    configured: true,
    url: "https://abcdefgh.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test_anon_key",
    serviceRole: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test_service_role",
  },
}));

vi.mock("@/lib/env", () => ({
  isSupabaseConfigured: () => env.configured,
  getSupabaseUrl: () => env.url,
  getSupabaseAnonKey: () => env.anonKey,
  getSupabaseServiceRoleKey: () => env.serviceRole,
}));

const { ctx } = vi.hoisted(() => ({
  ctx: { client: null as unknown },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ctx.client,
}));

import { createFakeClientFromStore, createSharedStore } from "../helpers/fakeClient";
import { getSupabaseIntegrationStatus } from "@/actions/settings";

function makeContext(opts?: { user?: { id: string } | null }) {
  const store = createSharedStore({
    projects: [{ id: "p1", name: "Real Site", slug: "real", status: "active", deleted_at: null }],
    profiles: [{ id: "u1", role: "admin", deleted_at: null }],
  });
  ctx.client = createFakeClientFromStore(store, {
    user: opts?.user === undefined ? { id: "u1" } : opts.user,
  });
  return store;
}

afterEach(() => {
  vi.clearAllMocks();
  env.configured = true;
});

describe("getSupabaseIntegrationStatus (settings)", () => {
  it("reports not-configured without probing clients", async () => {
    env.configured = false;
    const res = await getSupabaseIntegrationStatus();
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.configured).toBe(false);
    expect(res.data.url).toBeNull();
    expect(res.data.configSource).toBe("environment");
    expect(res.data.database).toBe(false);
    expect(res.data.storage).toBe(false);
    expect(res.data.documentsBucket).toBe(false);
    expect(res.data.auth).toBe(false);
  });

  it("reports configured with all probes healthy", async () => {
    makeContext();
    const res = await getSupabaseIntegrationStatus();
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.configured).toBe(true);
    expect(res.data.url).toBe(env.url);
    expect(res.data.configSource).toBe("environment");
    expect(res.data.database).toBe(true);
    expect(res.data.storage).toBe(true);
    expect(res.data.documentsBucket).toBe(true);
    expect(res.data.auth).toBe(true);
    expect(typeof res.data.environment).toBe("string");
    expect(typeof res.data.checkedAt).toBe("string");
  });

  it("flags auth unverified when no session can be resolved", async () => {
    makeContext({ user: null });
    await expect(getSupabaseIntegrationStatus()).rejects.toThrow();
  });

  it("flags storage unreachable when listBuckets errors", async () => {
    makeContext();
    (ctx.client as { storage: { listBuckets: () => Promise<unknown> } }).storage = {
      listBuckets: async () => ({ data: null, error: { message: "storage down" } }),
    };
    const res = await getSupabaseIntegrationStatus();
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.storage).toBe(false);
    expect(res.data.documentsBucket).toBe(false);
    expect(res.data.database).toBe(true);
  });

  it("never returns credentials or secrets", async () => {
    makeContext();
    const res = await getSupabaseIntegrationStatus();
    const payload = JSON.stringify(res);
    expect(payload).toContain(env.url);
    expect(payload).not.toContain(env.anonKey);
    expect(payload).not.toContain(env.serviceRole);
    expect(payload).not.toMatch(/service[_ -]?role/i);
  });
});