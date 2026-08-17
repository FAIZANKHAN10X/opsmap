import { describe, expect, it } from "vitest";

import { statusColor, STATUS_COLOR_PRESETS } from "@/lib/status-colors";

describe("statusColor", () => {
  it("prefers the explicit server color over the fallback", () => {
    expect(statusColor("available", "#ff0000")).toBe("#ff0000");
    expect(statusColor("maintenance", "#00ff00")).toBe("#00ff00");
  });

  it("falls back per slug when no explicit color is provided", () => {
    expect(statusColor("available", null)).toBe("#22c55e");
    expect(statusColor("offline", null)).toBe("#64748b");
  });

  it("is case-insensitive on slug fallback", () => {
    expect(statusColor("AVAILABLE", null)).toBe("#22c55e");
  });

  it("trims explicit colors", () => {
    expect(statusColor("available", "  #123456  ")).toBe("#123456");
  });

  it("falls back to a neutral color for unknown slugs", () => {
    expect(statusColor("unknown-slug", null)).toBe("#6b7380");
  });

  it("falls back to neutral when explicit color is blank", () => {
    expect(statusColor("available", "   ")).toBe("#22c55e");
  });

  it("exposes the color picker presets", () => {
    expect(STATUS_COLOR_PRESETS).toContain("#22c55e");
    expect(STATUS_COLOR_PRESETS.length).toBeGreaterThan(5);
  });
});