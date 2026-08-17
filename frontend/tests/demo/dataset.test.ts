import { describe, expect, it } from "vitest";

import { DEMO_ASSETS, DEMO_PROJECT_ID } from "@/lib/demo/dataset";
import { legendConceptForStatus } from "@/lib/hub-status";

const CONCEPTS = ["OPEN", "FILLING", "SOLD OUT", "NO OPS DATA"] as const;

describe("demo dataset", () => {
  it("has unique, valid asset ids and codes distinct from the project id", () => {
    const ids = new Set(DEMO_ASSETS.map((a) => a.id));
    const codes = new Set(DEMO_ASSETS.map((a) => a.code));
    expect(ids.size).toBe(DEMO_ASSETS.length);
    expect(codes.size).toBe(DEMO_ASSETS.length);
    for (const asset of DEMO_ASSETS) {
      expect(asset.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(asset.id).not.toBe(DEMO_PROJECT_ID);
    }
  });

  it("covers every 8AM HUB legend concept", () => {
    const concepts = new Set(
      DEMO_ASSETS.map((a) => legendConceptForStatus(a.statusSlug)),
    );
    for (const concept of CONCEPTS) {
      expect(concepts.has(concept)).toBe(true);
    }
  });

  it("positions every villa on the map with finite coordinates", () => {
    for (const asset of DEMO_ASSETS) {
      expect(Number.isFinite(asset.metadata.map_x)).toBe(true);
      expect(Number.isFinite(asset.metadata.map_y)).toBe(true);
    }
  });

  it("carries capacity/placed so the KPI blocks can be driven", () => {
    for (const asset of DEMO_ASSETS) {
      expect(Number(asset.metadata.capacity)).toBeGreaterThan(0);
      expect(Number(asset.metadata.placed)).toBeGreaterThanOrEqual(0);
      expect(Number(asset.metadata.placed)).toBeLessThanOrEqual(
        Number(asset.metadata.capacity),
      );
    }
  });

  it("produces deterministic KPI numbers through the shared aggregation math", () => {
    let placed = 0;
    let placedCapacity = 0;
    let villaCapacity = 0;
    let spotsOpen = 0;
    let soldOut = 0;
    for (const asset of DEMO_ASSETS) {
      const capacity = Number(asset.metadata.capacity ?? 0);
      if (capacity > 0) {
        villaCapacity += 1;
        placedCapacity += capacity;
      }
      placed += Number(asset.metadata.placed ?? 0);
      const concept = legendConceptForStatus(asset.statusSlug);
      if (concept === "OPEN") spotsOpen += 1;
      if (concept === "SOLD OUT") soldOut += 1;
    }

    expect({
      placed,
      placedCapacity,
      villaCapacity,
      spotsOpen,
      soldOut,
      total: DEMO_ASSETS.length,
    }).toEqual({
      placed: 25,
      placedCapacity: 92,
      villaCapacity: 16,
      spotsOpen: 4,
      soldOut: 3,
      total: 16,
    });
  });
});
