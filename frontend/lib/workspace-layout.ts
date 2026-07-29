/**
 * Resolve asset positions for the interactive workspace.
 *
 * Prefers explicit coordinates in asset.metadata (map_x, map_y).
 * Falls back to a stable grid so assets without coordinates remain navigable.
 *
 * Coordinate system: world space in CSS pixels (not lat/lng — GIS is later).
 */

import type { Asset } from "@/types/domain";

export type Point = { x: number; y: number };

export const WORLD_WIDTH = 1600;
export const WORLD_HEIGHT = 1000;
export const WORLD_PADDING = 80;

export function readAssetPosition(asset: Asset): Point | null {
  const x = asset.metadata.map_x;
  const y = asset.metadata.map_y;
  if (typeof x === "number" && typeof y === "number" && Number.isFinite(x) && Number.isFinite(y)) {
    return { x, y };
  }
  return null;
}

export function layoutAssets(assets: Asset[]): Map<string, Point> {
  const positions = new Map<string, Point>();
  const missing: Asset[] = [];

  for (const asset of assets) {
    const explicit = readAssetPosition(asset);
    if (explicit) {
      positions.set(asset.id, explicit);
    } else {
      missing.push(asset);
    }
  }

  if (missing.length === 0) {
    return positions;
  }

  const cols = Math.ceil(Math.sqrt(missing.length));
  const usableW = WORLD_WIDTH - WORLD_PADDING * 2;
  const usableH = WORLD_HEIGHT - WORLD_PADDING * 2;
  const rows = Math.ceil(missing.length / cols);

  missing.forEach((asset, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x =
      WORLD_PADDING +
      (cols === 1 ? usableW / 2 : (col / Math.max(cols - 1, 1)) * usableW);
    const y =
      WORLD_PADDING +
      (rows === 1 ? usableH / 2 : (row / Math.max(rows - 1, 1)) * usableH);
    positions.set(asset.id, { x, y });
  });

  return positions;
}

export function boundsOf(points: Point[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} | null {
  if (points.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}
