"use client";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { MapSkeleton } from "@/components/feedback/LoadingBlock";
import { LegendPanel } from "@/features/dashboard/LegendPanel";
import { InteractiveCanvas } from "@/features/workspace/InteractiveCanvas";
import type { Asset, AssetStatus, AssetType, ProjectSummary } from "@/types/domain";

type MapContainerProps = {
  assets: Asset[];
  statuses: AssetStatus[];
  types: AssetType[];
  summary: ProjectSummary | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

/**
 * Workspace host: loading / error / empty / interactive canvas.
 * Phase 4 — interactive navigation lives in InteractiveCanvas.
 */
export function MapContainer({
  assets,
  statuses,
  types,
  summary,
  loading,
  error,
  onRetry,
}: MapContainerProps) {
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

      {!loading && !error && assets.length === 0 ? (
        <>
          <EmptyState
            title="NO OPS DATA"
            description="This project has no assets yet. When assets are added, they will appear on the workspace map."
          />
          <div className="pointer-events-none absolute right-3 bottom-3 z-10 w-44 opacity-60">
            <LegendPanel statuses={statuses} summary={summary} />
          </div>
        </>
      ) : null}

      {!loading && !error && assets.length > 0 ? (
        <>
          <InteractiveCanvas
            assets={assets}
            statuses={statuses}
            types={types}
            dimNonHighlighted
          />
          <div
            className="pointer-events-none absolute right-3 bottom-3 z-20 w-44"
            data-workspace-ui
          >
            <div className="pointer-events-auto">
              <LegendPanel statuses={statuses} summary={summary} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
