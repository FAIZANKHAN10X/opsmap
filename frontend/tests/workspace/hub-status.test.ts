import { describe, expect, it } from "vitest";

import {
  HUB_LEGEND_COLORS,
  HUB_LEGEND_ORDER,
  legendConceptForStatus,
} from "@/lib/hub-status";

describe("legendConceptForStatus", () => {
  it("maps the default engine slugs onto the 8AM HUB legend", () => {
    expect(legendConceptForStatus("available")).toBe("OPEN");
    expect(legendConceptForStatus("reserved")).toBe("FILLING");
    expect(legendConceptForStatus("occupied")).toBe("FILLING");
    expect(legendConceptForStatus("pending")).toBe("FILLING");
    expect(legendConceptForStatus("sold")).toBe("SOLD OUT");
    expect(legendConceptForStatus("maintenance")).toBe("NO OPS DATA");
    expect(legendConceptForStatus("offline")).toBe("NO OPS DATA");
  });

  it("falls back to NO OPS DATA for unknown or missing slugs", () => {
    expect(legendConceptForStatus("custom-slug")).toBe("NO OPS DATA");
    expect(legendConceptForStatus(null)).toBe("NO OPS DATA");
    expect(legendConceptForStatus(undefined)).toBe("NO OPS DATA");
    expect(legendConceptForStatus("")).toBe("NO OPS DATA");
  });

  it("exposes the four legend concepts in order with colors", () => {
    expect(HUB_LEGEND_ORDER).toEqual([
      "OPEN",
      "FILLING",
      "SOLD OUT",
      "NO OPS DATA",
    ]);
    for (const concept of HUB_LEGEND_ORDER) {
      expect(HUB_LEGEND_COLORS[concept]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});