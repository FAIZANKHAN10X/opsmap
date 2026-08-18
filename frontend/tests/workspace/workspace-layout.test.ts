import { describe, expect, it } from "vitest";

import type { Asset } from "@/types/domain";
import {
  boundsOf,
  layoutAssets,
  readAssetPosition,
  screenToWorld,
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

  it("screenToWorld maps container-relative clicks to world coordinates", () => {
    const rect = { left: 100, top: 50 };
    expect(screenToWorld(420, 210, rect, { x: 0, y: 0, zoom: 1 })).toEqual({
      x: 320,
      y: 160,
    });
  });

  it("screenToWorld accounts for viewport pan", () => {
    const rect = { left: 0, top: 0 };
    expect(screenToWorld(500, 300, rect, { x: -40, y: -60, zoom: 1 })).toEqual({
      x: 540,
      y: 360,
    });
  });

  it("screenToWorld divides by zoom for scaled views", () => {
    const rect = { left: 0, top: 0 };
    expect(screenToWorld(600, 400, rect, { x: 0, y: 0, zoom: 2 })).toEqual({
      x: 300,
      y: 200,
    });
  });

  it("screenToWorld combines pan and zoom", () => {
    const rect = { left: 200, top: 100 };
    expect(screenToWorld(600, 300, rect, { x: 50, y: 20, zoom: 2 })).toEqual({
      x: 175,
      y: 90,
    });
  });
});