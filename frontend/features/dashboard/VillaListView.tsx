"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  HUB_LEGEND_COLORS,
  legendConceptForStatus,
} from "@/lib/hub-status";
import { useShell } from "@/stores/shell-context";
import type { Asset, AssetStatus, AssetType } from "@/types/domain";

type VillaListViewProps = {
  assets: Asset[];
  statuses: AssetStatus[];
  types: AssetType[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  emptyAction?: ReactNode;
  /** Called when a placed property is selected so the host can surface the map. */
  onFocusPlaced?: () => void;
};

function metaNumber(asset: Asset, keys: string[]): number | null {
  for (const key of keys) {
    const value = asset.metadata[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

/**
 * VILLA LIST — alternate view of the same property data as the map
 * (Phase 11). Selecting a row opens the same info panel used by the map.
 */
export function VillaListView({
  assets,
  statuses,
  types,
  loading,
  error,
  onRetry,
  emptyAction,
  onFocusPlaced,
}: VillaListViewProps) {
  const { selectedAssetId, requestMapFocus, setSelectedAssetId, setInfoPanelOpen, filters, clearFilters } =
    useShell();
  const typeById = new Map(types.map((t) => [t.id, t]));
  const statusById = new Map(statuses.map((s) => [s.id, s]));
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
  const hasActiveFilters =
    filters.search.trim().length > 0 ||
    filters.statusSlugs.length > 0 ||
    filters.typeSlugs.length > 0 ||
    filters.placement != null ||
    filters.priceMin != null ||
    filters.priceMax != null ||
    Boolean(filters.currency) ||
    filters.bedroomsMin != null ||
    filters.bathroomsMin != null ||
    filters.areaMin != null ||
    filters.areaMax != null ||
    Boolean(filters.furnishing) ||
    (filters.features && filters.features.length > 0);

  // Map → list: when a marker is clicked, scroll its row into view.
  useEffect(() => {
    if (!selectedAssetId) return;
    const el = rowRefs.current.get(selectedAssetId);
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedAssetId]);

  function isAssetPlaced(asset: Asset): boolean {
    return (
      typeof asset.latitude === "number" &&
      Number.isFinite(asset.latitude) &&
      typeof asset.longitude === "number" &&
      Number.isFinite(asset.longitude)
    );
  }

  function openAsset(asset: Asset) {
    if (isAssetPlaced(asset)) {
      // List → map: focus the real map on this property's marker.
      requestMapFocus(asset.id);
      onFocusPlaced?.();
      return;
    }
    // Unplaced properties have no map location — open the preview in place.
    setSelectedAssetId(asset.id);
    setInfoPanelOpen(true);
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-surface)]">
      {loading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : null}

      {!loading && error ? <ErrorState message={error} onRetry={onRetry} /> : null}

      {!loading && !error && assets.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState
            title="No properties match"
            description="No properties match the current filters. Try adjusting or clearing filters."
            action={
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="YOUR PLAN IS EMPTY"
            description="No properties in this development yet. Add a property to see it here and on the map."
            action={emptyAction}
          />
        )
      ) : null}

      {!loading && !error && assets.length > 0 ? (
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-[var(--ops-bg-elevated)] text-[11px] tracking-wide text-[var(--ops-text-muted)] uppercase">
            <tr className="border-b border-[var(--ops-border)]">
              <th className="px-3 py-2.5 font-medium">Property</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium">Type</th>
              <th className="px-3 py-2.5 font-medium">Capacity</th>
              <th className="px-3 py-2.5 font-medium">Placed</th>
              <th className="px-3 py-2.5 font-medium">Location</th>
              <th className="px-3 py-2.5 font-medium">Owner</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => {
              const status = asset.asset_status_id
                ? statusById.get(asset.asset_status_id)
                : undefined;
              const type = asset.asset_type_id
                ? typeById.get(asset.asset_type_id)
                : undefined;
              const concept = legendConceptForStatus(status?.slug);
              const capacity = metaNumber(asset, ["capacity", "pax"]);
              const placed = metaNumber(asset, ["placed"]);
              return (
                <tr
                  key={asset.id}
                  ref={(el) => {
                    if (el) rowRefs.current.set(asset.id, el);
                    else rowRefs.current.delete(asset.id);
                  }}
                  aria-selected={selectedAssetId === asset.id}
                  className={`cursor-pointer border-b border-[var(--ops-border-subtle)] hover:bg-[var(--ops-surface-hover)] ${
                    selectedAssetId === asset.id ? "bg-[var(--ops-accent-muted)]" : ""
                  }`}
                  onClick={() => openAsset(asset)}
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Icon name="pin" size={14} className="text-[var(--ops-text-muted)]" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--ops-text)]">
                          {asset.name}
                        </p>
                        {asset.code ? (
                          <p className="font-mono text-[10px] text-[var(--ops-text-muted)]">
                            {asset.code}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ops-text-secondary)]">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor:
                            status?.color ?? HUB_LEGEND_COLORS[concept],
                        }}
                      />
                      {status?.name ?? "No status"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[var(--ops-text-secondary)]">
                    {type?.name ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-[var(--ops-text)]">
                    {capacity ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-[var(--ops-text)]">
                    {placed ?? "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    {isAssetPlaced(asset) ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ops-accent-hover)]">
                        <Icon name="pin" size={12} /> Placed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ops-text-muted)]">
                        Not placed
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--ops-text-secondary)]">
                    {asset.owner ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : null}

      {!loading && !error && assets.length > 0 ? (
        <div className="border-t border-[var(--ops-border)] p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setInfoPanelOpen(true)}
            aria-label="Open details panel"
          >
            <Icon name="panel" size={14} />
            Details
          </Button>
        </div>
      ) : null}
    </div>
  );
}