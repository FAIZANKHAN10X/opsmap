/**
 * Lightweight runtime checks for workspace layout helpers.
 * Run via: npx tsx lib/workspace-layout.test.ts  (optional)
 * Primary verification is production typecheck/build.
 */

import { boundsOf, layoutAssets, readAssetPosition } from "./workspace-layout";
import type { Asset } from "@/types/domain";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

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
  created_at: "",
  updated_at: "",
};

assert(readAssetPosition(base) === null, "empty metadata has no position");
assert(
  readAssetPosition({ ...base, metadata: { map_x: 10, map_y: 20 } })?.x === 10,
  "reads map_x",
);

const laid = layoutAssets([
  { ...base, id: "a", metadata: { map_x: 100, map_y: 100 } },
  { ...base, id: "b", metadata: {} },
]);
assert(laid.get("a")?.x === 100, "keeps explicit coords");
assert(laid.has("b"), "grids missing coords");

const b = boundsOf([
  { x: 0, y: 0 },
  { x: 10, y: 20 },
]);
assert(b?.maxX === 10 && b?.maxY === 20, "bounds");

console.log("workspace-layout checks passed");
