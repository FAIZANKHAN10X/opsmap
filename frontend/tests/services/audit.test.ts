import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { audit } from "@/lib/server/audit";

describe("audit", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs a structured line with the [audit] prefix and details", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    audit("asset.deleted", { asset_id: "a1" });
    expect(spy).toHaveBeenCalledWith("[audit] asset.deleted", { asset_id: "a1" });
  });

  it("works with no details", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    expect(() => audit("project.deleted")).not.toThrow();
    expect(spy).toHaveBeenCalledWith("[audit] project.deleted", {});
  });

  it("redacts sensitive keys before logging", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    audit("auth.event", { email: "user@example.com", api_key: "sk-1234", service_role_key: "x", ok: true });
    expect(spy).toHaveBeenCalledWith("[audit] auth.event", {
      email: "user@example.com",
      api_key: "[redacted]",
      service_role_key: "[redacted]",
      ok: true,
    });
  });

  it("never throws for arbitrary detail values", () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    expect(() => audit("asset.updated", { id: 1, changes: ["name"], nested: { ok: true } })).not.toThrow();
  });
});