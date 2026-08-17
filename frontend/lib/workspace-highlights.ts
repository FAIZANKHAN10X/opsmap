/**
 * Compute the set of asset ids to highlight given active workspace filters.
 *
 * Pure function (no DOM/hooks) so the workspace highlight rules are unit
 * testable. Priority: explicit highlight ids > search > status > type.
 */

import type { Asset, AssetStatus, AssetType } from "@/types/domain";
import type { AssetFilterState } from "@/types/ui";

type HighlightInput = {
  assets: Asset[];
  statuses: AssetStatus[];
  types: AssetType[];
  filters: AssetFilterState;
  /** External highlight set (e.g. from a search result). Empty = ignored. */
  highlightIds?: Set<string>;
};

export function computeHighlightIds({
  assets,
  statuses,
  types,
  filters,
  highlightIds,
}: HighlightInput): Set<string> {
  if (highlightIds && highlightIds.size > 0) return highlightIds;

  if (filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    return new Set(
      assets
        .filter(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            (a.code?.toLowerCase().includes(q) ?? false),
        )
        .map((a) => a.id),
    );
  }

  if (filters.statusSlugs.length > 0) {
    const allowed = new Set(
      statuses
        .filter((s) => filters.statusSlugs.includes(s.slug))
        .map((s) => s.id),
    );
    return new Set(
      assets
        .filter(
          (a) => a.asset_status_id != null && allowed.has(a.asset_status_id),
        )
        .map((a) => a.id),
    );
  }

  if (filters.typeSlugs.length > 0) {
    const allowed = new Set(
      types
        .filter((t) => filters.typeSlugs.includes(t.slug))
        .map((t) => t.id),
    );
    return new Set(
      assets
        .filter(
          (a) => a.asset_type_id != null && allowed.has(a.asset_type_id),
        )
        .map((a) => a.id),
    );
  }

  return new Set<string>();
}