"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { HubKpiCards } from "@/features/dashboard/HubKpiCards";
import { StatusDistribution } from "@/features/dashboard/StatusDistribution";
import {
  HUB_LEGEND_COLORS,
  legendConceptForStatus,
} from "@/lib/hub-status";
import { listAssets } from "@/services/assets";
import { getProjectSummary, listAssetStatuses } from "@/services/dashboard";
import { useShell } from "@/stores/shell-context";
import type { Asset, AssetStatus, ProjectSummary } from "@/types/domain";

/**
 * DASHBOARD — business/operations overview for the selected development:
 * KPI cards, status distribution, and a portfolio list of persisted
 * properties. No property map and no villa-management workspace.
 */
export function DashboardOverview() {
  const { selectedProjectId, demoMode, refreshKey } = useShell();
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [statuses, setStatuses] = useState<AssetStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setReloadToken((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!selectedProjectId && !demoMode) return;
    let cancelled = false;

    async function load() {
      try {
        const [summaryRes, assetsRes, statusRes] = await Promise.all([
          getProjectSummary(selectedProjectId ?? "", demoMode),
          listAssets(
            {
              project_id: demoMode ? undefined : (selectedProjectId ?? undefined),
              limit: 100,
            },
            demoMode,
          ),
          listAssetStatuses(),
        ]);
        if (cancelled) return;
        setSummary(summaryRes.data);
        setAssets(assetsRes.data);
        setStatuses(statusRes.data);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setSummary(null);
        setAssets([]);
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      void load();
    });

    return () => {
      cancelled = true;
    };
  }, [selectedProjectId, demoMode, reloadToken, refreshKey]);

  if (!selectedProjectId && !demoMode) {
    return (
      <EmptyState
        title="NOTHING TO OPERATE YET"
        description="Create a development first. The dashboard shows occupancy and capacity for the selected site — not a property editor."
        action={
          <Link
            href="/dashboard/projects"
            className="inline-flex h-8 items-center gap-1.5 rounded-[var(--ops-radius)] border border-transparent bg-[var(--ops-accent)] px-3 text-xs font-medium text-white transition-colors hover:bg-[var(--ops-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ops-focus)]"
          >
            <Icon name="plus" size={14} />
            Create development
          </Link>
        }
      />
    );
  }

  const emptyPortfolio = !loading && !error && assets.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3 lg:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-semibold tracking-wide text-[var(--ops-text)] uppercase">
            Portfolio overview
          </h1>
          <p className="text-xs text-[var(--ops-text-muted)]">
            Operational counts from persisted property data.
          </p>
        </div>
        <Link href="/dashboard/development">
          <Button variant="secondary" size="sm" className="h-8">
            Manage properties
            <Icon name="chevron-right" size={14} />
          </Button>
        </Link>
      </div>

      {emptyPortfolio ? (
        <EmptyState
          title="YOUR PLAN IS EMPTY"
          description="No properties in this development yet. Add a property from the workspace — it will appear here and on the map. KPI cards stay hidden until there is data to show."
          action={
            <Link
              href="/dashboard/development"
              className="inline-flex h-8 items-center gap-1.5 rounded-[var(--ops-radius)] border border-transparent bg-[var(--ops-accent)] px-3 text-xs font-medium text-white transition-colors hover:bg-[var(--ops-accent-hover)]"
            >
              <Icon name="plus" size={14} />
              Add property
            </Link>
          }
        />
      ) : (
        <>
          <HubKpiCards summary={summary} loading={loading} />
          <StatusDistribution summary={summary} />
          <PortfolioList assets={assets} statuses={statuses} loading={loading} />
        </>
      )}

      {!loading && error ? (
        <div className="rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-surface)]">
          <ErrorState
            title="Dashboard failed to load"
            message={error}
            onRetry={reload}
          />
        </div>
      ) : null}
    </div>
  );
}

function PortfolioList({
  assets,
  statuses,
  loading,
}: {
  assets: Asset[];
  statuses: AssetStatus[];
  loading: boolean;
}) {
  if (loading || assets.length === 0) return null;

  const statusById = new Map(statuses.map((s) => [s.id, s]));

  return (
    <section className="rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-surface)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--ops-border)] px-4 py-3">
        <h2 className="text-xs font-semibold tracking-wide text-[var(--ops-text-muted)] uppercase">
          Properties
        </h2>
        <p className="text-xs text-[var(--ops-text-muted)]">
          {assets.length} in this development
        </p>
      </div>
      <ul className="divide-y divide-[var(--ops-border)]">
        {assets.map((asset) => {
          const status = asset.asset_status_id
            ? statusById.get(asset.asset_status_id)
            : undefined;
          const concept = legendConceptForStatus(status?.slug);
          const capacity = asset.metadata.capacity ?? asset.metadata.pax;
          const placed = asset.metadata.placed;
          return (
            <li key={asset.id}>
              <Link
                href={`/dashboard/properties/${asset.id}`}
                className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[var(--ops-surface-hover)]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--ops-text)]">
                    {asset.code ? `${asset.code} · ` : ""}
                    {asset.name}
                  </p>
                  <p className="truncate text-xs text-[var(--ops-text-muted)]">
                    {capacity != null && capacity !== ""
                      ? `Capacity ${String(capacity)}`
                      : "No capacity set"}
                    {placed != null && placed !== ""
                      ? ` · Placed ${String(placed)}`
                      : ""}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-[var(--ops-text-secondary)]">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: HUB_LEGEND_COLORS[concept] }}
                  />
                  {concept}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
