import { describe, expect, it } from "vitest";

import { computeHighlightIds } from "@/lib/workspace-highlights";
import type { Asset, AssetStatus, AssetType } from "@/types/domain";
import type { AssetFilterState } from "@/types/ui";

const baseAsset: Asset = {
  id: "a1",
  project_id: "p",
  asset_type_id: null,
  asset_status_id: null,
  name: "Pump 1",
  code: "PMP-1",
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

const STATUS_A = "223e4567-e89b-12d3-a456-426614174001";
const STATUS_B = "323e4567-e89b-12d3-a456-426614174002";
const TYPE_A = "423e4567-e89b-12d3-a456-426614174003";
const TYPE_B = "523e4567-e89b-12d3-a456-426614174004";

const statuses: AssetStatus[] = [
  { id: STATUS_A, slug: "available", name: "Available", color: "#22c55e", sort_order: 1, description: null, created_at: "", updated_at: "" },
  { id: STATUS_B, slug: "offline", name: "Offline", color: "#64748b", sort_order: 2, description: null, created_at: "", updated_at: "" },
];

const types: AssetType[] = [
  { id: TYPE_A, slug: "pump", name: "Pump", sort_order: 1, description: null, created_at: "", updated_at: "" },
  { id: TYPE_B, slug: "valve", name: "Valve", sort_order: 2, description: null, created_at: "", updated_at: "" },
];

const assets: Asset[] = [
  { ...baseAsset, id: "a1", name: "Pump 1", code: "PMP-1", asset_status_id: STATUS_A, asset_type_id: TYPE_A },
  { ...baseAsset, id: "a2", name: "Pump 2", code: "PMP-2", asset_status_id: STATUS_B, asset_type_id: TYPE_A },
  { ...baseAsset, id: "a3", name: "Valve 3", code: "VLV-3", asset_status_id: STATUS_A, asset_type_id: TYPE_B },
];

const defaultFilters: AssetFilterState = { search: "", statusSlugs: [], typeSlugs: [] };

describe("computeHighlightIds", () => {
  it("returns nothing when no filters and no external highlight set", () => {
    expect(computeHighlightIds({ assets, statuses, types, filters: defaultFilters })).toEqual(new Set());
  });

  it("uses the external highlight set when provided", () => {
    const ids = new Set(["a2"]);
    expect(computeHighlightIds({ assets, statuses, types, filters: defaultFilters, highlightIds: ids })).toEqual(ids);
  });

  it("highlights by search across name and code", () => {
    expect(computeHighlightIds({ assets, statuses, types, filters: { ...defaultFilters, search: "pump" } })).toEqual(new Set(["a1", "a2"]));
    expect(computeHighlightIds({ assets, statuses, types, filters: { ...defaultFilters, search: "vlv-3" } })).toEqual(new Set(["a3"]));
  });

  it("highlights by status slugs", () => {
    expect(computeHighlightIds({ assets, statuses, types, filters: { ...defaultFilters, statusSlugs: ["available"] } })).toEqual(new Set(["a1", "a3"]));
  });

  it("highlights by type slugs", () => {
    expect(computeHighlightIds({ assets, statuses, types, filters: { ...defaultFilters, typeSlugs: ["pump"] } })).toEqual(new Set(["a1", "a2"]));
  });

  it("ignores unknown status/type slugs (matches nothing)", () => {
    expect(computeHighlightIds({ assets, statuses, types, filters: { ...defaultFilters, statusSlugs: ["ghost"] } })).toEqual(new Set());
    expect(computeHighlightIds({ assets, statuses, types, filters: { ...defaultFilters, typeSlugs: ["ghost"] } })).toEqual(new Set());
  });

  it("excludes assets without a matching status id", () => {
    const noStatus = [{ ...baseAsset, id: "a4", asset_status_id: null, asset_type_id: null }];
    expect(computeHighlightIds({ assets: [...assets, ...noStatus], statuses, types, filters: { ...defaultFilters, statusSlugs: ["available"] } })).toEqual(new Set(["a1", "a3"]));
  });

  it("search takes precedence over status/type filters", () => {
    expect(computeHighlightIds({ assets, statuses, types, filters: { search: "pump", statusSlugs: ["available"], typeSlugs: ["valve"] } })).toEqual(new Set(["a1", "a2"]));
  });
});