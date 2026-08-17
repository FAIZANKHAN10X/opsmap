import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  isSupabaseConfigured: vi.fn(() => false),
}));

const { auth } = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn<() => Promise<{ data: { user: { id: string } | null } }>>(
      async () => ({ data: { user: null } }),
    ),
  },
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({ auth })),
}));

import { NextRequest } from "next/server";
import { updateSession } from "@/middleware";
import { isSupabaseConfigured } from "@/lib/env";

const mockedConfigured = vi.mocked(isSupabaseConfigured);

function req(path: string) {
  return new NextRequest(`http://localhost${path}`);
}

afterEach(() => {
  vi.clearAllMocks();
  mockedConfigured.mockReturnValue(false);
  auth.getUser.mockImplementation(async () => ({ data: { user: null } }));
});

describe("middleware deny-by-default behavior", () => {
  it("redirects protected routes to /login when Supabase is not configured", async () => {
    const res = await updateSession(req("/dashboard"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("allows the login route when Supabase is not configured", async () => {
    const res = await updateSession(req("/login"));
    expect(res.status).toBe(200);
  });

  it("redirects protected routes when unauthenticated", async () => {
    mockedConfigured.mockReturnValue(true);
    const res = await updateSession(req("/projects"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("allows public routes when unauthenticated", async () => {
    mockedConfigured.mockReturnValue(true);
    const res = await updateSession(req("/login"));
    expect(res.status).toBe(200);
  });

  it("redirects authenticated users away from /login", async () => {
    mockedConfigured.mockReturnValue(true);
    auth.getUser.mockImplementation(async () => ({
      data: { user: { id: "u1" } },
    }));
    const res = await updateSession(req("/login"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/dashboard");
  });

  it("allows authenticated users onto protected routes", async () => {
    mockedConfigured.mockReturnValue(true);
    auth.getUser.mockImplementation(async () => ({
      data: { user: { id: "u1" } },
    }));
    const res = await updateSession(req("/dashboard"));
    expect(res.status).toBe(200);
  });
});