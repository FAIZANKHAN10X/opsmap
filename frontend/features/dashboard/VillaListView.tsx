"use client";

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
}: VillaListViewProps) {
  const { setSelectedAssetId, setInfoPanelOpen } = useShell();
  const typeById = new Map(types.map((t) => [t.id, t]));
  const statusById = new Map(statuses.map((s) => [s.id, s]));

  function openAsset(asset: Asset) {
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
        <EmptyState
          title="NO VILLAS"
          description="No property data for this project yet."
        />
      ) : null}

      {!loading && !error && assets.length > 0 ? (
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-[var(--ops-bg-elevated)] text-[11px] tracking-wide text-[var(--ops-text-muted)] uppercase">
            <tr className="border-b border-[var(--ops-border)]">
              <th className="px-3 py-2.5 font-medium">Villa</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium">Type</th>
              <th className="px-3 py-2.5 font-medium">Capacity</th>
              <th className="px-3 py-2.5 font-medium">Placed</th>
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
                  className="cursor-pointer border-b border-[var(--ops-border-subtle)] hover:bg-[var(--ops-surface-hover)]"
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
                          backgroundColor: HUB_LEGEND_COLORS[concept],
                        }}
                      />
                      {concept}
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