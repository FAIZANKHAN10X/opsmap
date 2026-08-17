import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  isSupabaseConfigured: vi.fn(() => true),
}));

import { GET } from "@/app/api/health/route";
import { isSupabaseConfigured } from "@/lib/env";

const mocked = vi.mocked(isSupabaseConfigured);

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/health", () => {
  it("reports ok when Supabase is configured", async () => {
    mocked.mockReturnValue(true);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("ok");
    expect(body.data.supabase).toBe("configured");
    expect(body.data.service).toBe("OpsMap");
    expect(body.data.environment).toBeDefined();
  });

  it("reports degraded when Supabase is not configured", async () => {
    mocked.mockReturnValue(false);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("degraded");
    expect(body.data.supabase).toBe("unavailable");
  });
});