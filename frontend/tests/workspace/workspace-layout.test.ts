import { describe, expect, it } from "vitest";

import type { Asset } from "@/types/domain";
import {
  boundsOf,
  layoutAssets,
  readAssetPosition,
} from "@/lib/workspace-layout";

const base: Asset = {
  id: "1",
  project_id: "p",
  asset_type_id: null,
  asset_status_id: null,
  name: "A",
  code: "A1",
  description: null,
  owner: null,
  notes: null,
  assignees: [],
  metadata: {},
  created_by: null,
  updated_by: null,
  created_at: "",
  updated_at: "",
};

describe("workspace-layout", () => {
  it("readAssetPosition returns null for empty metadata", () => {
    expect(readAssetPosition(base)).toBeNull();
  });

  it("readAssetPosition reads map_x/map_y", () => {
    const pos = readAssetPosition({ ...base, metadata: { map_x: 10, map_y: 20 } });
    expect(pos).toEqual({ x: 10, y: 20 });
  });

  it("readAssetPosition rejects non-finite coordinates", () => {
    expect(readAssetPosition({ ...base, metadata: { map_x: "x", map_y: 20 } })).toBeNull();
    expect(readAssetPosition({ ...base, metadata: { map_x: Infinity, map_y: 20 } })).toBeNull();
  });

  it("layoutAssets keeps explicit coordinates and grids missing ones", () => {
    const laid = layoutAssets([
      { ...base, id: "a", metadata: { map_x: 100, map_y: 100 } },
      { ...base, id: "b", metadata: {} },
    ]);
    expect(laid.get("a")).toEqual({ x: 100, y: 100 });
    expect(laid.has("b")).toBe(true);
    expect(laid.size).toBe(2);
  });

  it("layoutAssets produces distinct grid positions for missing assets", () => {
    const laid = layoutAssets([
      { ...base, id: "a", metadata: {} },
      { ...base, id: "b", metadata: {} },
      { ...base, id: "c", metadata: {} },
    ]);
    const positions = [...laid.values()];
    const unique = new Set(positions.map((p) => `${p.x},${p.y}`));
    expect(unique.size).toBe(3);
  });

  it("boundsOf computes min/max", () => {
    expect(
      boundsOf([
        { x: 0, y: 0 },
        { x: 10, y: 20 },
      ]),
    ).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 20 });
  });

  it("boundsOf returns null for empty points", () => {
    expect(boundsOf([])).toBeNull();
  });
});