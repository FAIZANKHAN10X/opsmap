import { describe, expect, it } from "vitest";

import {
  DEMO_ASSETS,
  DEMO_CONTACTS,
  DEMO_PROJECT_ID,
} from "@/lib/demo/dataset";
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

  it("derives one demo contact per unique owner/assignee name", () => {
    const names = new Set<string>();
    for (const asset of DEMO_ASSETS) {
      if (asset.owner) names.add(asset.owner.trim());
      for (const assignee of asset.assignees) names.add(assignee.trim());
    }
    expect(DEMO_CONTACTS).toHaveLength(names.size);
    expect(new Set(DEMO_CONTACTS.map((c) => c.full_name)).size).toBe(
      DEMO_CONTACTS.length,
    );
  });

  it("assigns owners type 'owner' and assignees type 'other'", () => {
    const byName = new Map(DEMO_CONTACTS.map((c) => [c.full_name, c]));
    for (const asset of DEMO_ASSETS) {
      if (asset.owner) {
        expect(byName.get(asset.owner.trim())?.type).toBe("owner");
      }
    }
    for (const asset of DEMO_ASSETS) {
      for (const assignee of asset.assignees) {
        if (assignee.trim()) {
          expect(byName.get(assignee.trim())?.type).toBe("other");
        }
      }
    }
  });

  it("links a contact to every property it appears on without duplication", () => {
    // Putu Setiawan owns two demo villas (V-114 and V-116) — one contact,
    // two links, never duplicated per property.
    const putu = DEMO_CONTACTS.find((c) => c.full_name === "Putu Setiawan");
    expect(putu).toBeDefined();
    expect(putu?.links.length).toBe(2);
    const keys = putu?.links.map((l) => `${l.assetId}:${l.role}`);
    expect(new Set(keys).size).toBe(keys?.length);
  });

  it("gives demo contacts ids distinct from demo assets and the project", () => {
    const assetIds = new Set(DEMO_ASSETS.map((a) => a.id));
    for (const contact of DEMO_CONTACTS) {
      expect(contact.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(assetIds.has(contact.id)).toBe(false);
      expect(contact.id).not.toBe(DEMO_PROJECT_ID);
    }
  });
});
