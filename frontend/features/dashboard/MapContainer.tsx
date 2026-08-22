"use client";

import { useMemo, useState, type ReactNode } from "react";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { MapSkeleton } from "@/components/feedback/LoadingBlock";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { LegendPanel } from "@/features/dashboard/LegendPanel";
import { PropertyMap } from "@/features/map/PropertyMapLazy";
import type { GeoPoint } from "@/features/map/geo";
import { useShell } from "@/stores/shell-context";
import type { Asset, AssetStatus, AssetType, ProjectSummary } from "@/types/domain";

type MapContainerProps = {
  assets: Asset[];
  statuses: AssetStatus[];
  types: AssetType[];
  summary: ProjectSummary | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  /** Pending click-to-place coordinates forwarded to the map. */
  placement?: GeoPoint | null;
  /** When set, map clicks emit geographic coordinates instead of clearing selection. */
  onPlace?: (coords: GeoPoint) => void;
  /** Optional empty-state action (e.g. Add property). */
  emptyAction?: ReactNode;
};

/**
 * Workspace host for the REAL geographic property map (Google Maps). Markers
 * are driven by the same server-filtered asset list the list view uses;
 * selection flows through the shared shell store so map ↔ list stay consistent.
 * Uses native Google map-type control (Roadmap/Satellite); fit is custom.
 */
export function MapContainer({
  assets,
  statuses,
  summary,
  loading,
  error,
  onRetry,
  placement,
  onPlace,
  emptyAction,
}: MapContainerProps) {
  // `types` is accepted for API compatibility with the workspace loader but
  // the real map derives marker styling from the status engine directly.
  const shell = useShell();
  const [fitNonce, setFitNonce] = useState(0);

  const placedCount = useMemo(
    () =>
      assets.filter(
        (a) =>
          typeof a.latitude === "number" &&
          Number.isFinite(a.latitude) &&
          typeof a.longitude === "number" &&
          Number.isFinite(a.longitude),
      ).length,
    [assets],
  );
  const unplacedCount = assets.length - placedCount;

  // List → map: focus the selected marker when a focus request arrives.
  const focusRequest = shell.mapFocusRequest;

  // Keep InfoPanel behavior identical to before: selecting a marker opens it.
  const handleSelect = (assetId: string | null) => {
    if (!assetId) {
      if (shell.infoPanelOpen && !placementMode) shell.setInfoPanelOpen(false);
      return;
    }
    shell.setSelectedAssetId(assetId);
    shell.setInfoPanelOpen(true);
  };

  const showMap = !loading && !error;
  const hasActiveFilters =
    shell.filters.search.trim().length > 0 ||
    shell.filters.statusSlugs.length > 0 ||
    shell.filters.typeSlugs.length > 0 ||
    shell.filters.placement != null ||
    shell.filters.priceMin != null ||
    shell.filters.priceMax != null ||
    Boolean(shell.filters.currency) ||
    shell.filters.bedroomsMin != null ||
    shell.filters.bathroomsMin != null ||
    shell.filters.areaMin != null ||
    shell.filters.areaMax != null ||
    Boolean(shell.filters.furnishing) ||
    (shell.filters.features && shell.filters.features.length > 0);
  const showEmpty =
    !loading && !error && assets.length === 0 && !onPlace && unplacedCount === 0 && !hasActiveFilters;
  const showFilteredEmpty = !loading && !error && assets.length === 0 && !onPlace && hasActiveFilters;

  // Placement banner mirrors the old canvas flow.
  const placementMode = Boolean(onPlace);

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-surface)]">
      {loading ? <MapSkeleton /> : null}

      {!loading && error ? (
        <ErrorState
          title="Workspace failed to load"
          message={error}
          onRetry={onRetry}
        />
      ) : null}

      {!loading && !error && showEmpty ? (
        <>
          <EmptyState
            title="YOUR MAP IS EMPTY"
            description="This development has no properties yet. Add a property, then click the map to place it."
            action={emptyAction}
          />
          <div className="pointer-events-none absolute right-3 bottom-3 z-10 w-44 opacity-60">
            <LegendPanel summary={summary} />
          </div>
        </>
      ) : null}

      {showFilteredEmpty ? (
        <div className="flex h-full w-full items-center justify-center p-6">
          <EmptyState
            title="No properties match"
            description="No properties match the current filters. Adjust filters to see markers."
            action={
              <Button variant="secondary" size="sm" onClick={shell.clearFilters}>
                Clear filters
              </Button>
            }
          />
        </div>
      ) : null}

      {showMap && !showEmpty ? (
        <>
          <PropertyMap
            className="absolute inset-0"
            assets={assets}
            statuses={statuses}
            selectedAssetId={shell.selectedAssetId}
            onSelect={handleSelect}
            placementMode={placementMode}
            placement={placement}
            onPlace={onPlace}
            focusRequest={focusRequest}
            fitNonce={fitNonce}
          />

          {/* Floating functional controls — no obstruction of gestures */}
          <div
            className="pointer-events-none absolute left-3 top-3 z-20 flex flex-wrap items-center gap-2"
            data-workspace-ui
          >
            <div className="pointer-events-auto">
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full shadow-sm"
                onClick={() => setFitNonce((n) => n + 1)}
                disabled={placedCount === 0}
                title={
                  placedCount === 0
                    ? "No placed properties yet"
                    : "Zoom to all placed properties"
                }
              >
                <Icon name="crosshair" size={14} /> Fit properties ({placedCount})
              </Button>
            </div>
          </div>

          <div
            className="pointer-events-none absolute right-3 bottom-3 z-20 w-44"
            data-workspace-ui
          >
            <div className="pointer-events-auto">
              <LegendPanel summary={summary} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
