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
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState
          title="No development selected"
          description="Create or select a development to view its operations dashboard."
          action={
            <Link href="/dashboard/projects">
              <Button variant="primary" size="md">
                <Icon name="plus" size={16} />
                Create development
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const emptyPortfolio = !loading && !error && assets.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto p-4 md:p-8 bg-[var(--ops-bg)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ops-text)]">
            Dashboard
          </h1>
          <p className="text-[15px] text-[var(--ops-text-secondary)] mt-1.5">
            Overview of development operations and properties.
          </p>
        </div>
        <Link href="/dashboard/development">
          <Button variant="secondary" size="md" className="rounded-full shadow-sm bg-white">
            Manage properties
            <Icon name="chevron-right" size={16} />
          </Button>
        </Link>
      </div>

      {emptyPortfolio ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] shadow-[var(--ops-shadow-sm)]">
          <div className="w-16 h-16 bg-[var(--ops-accent-muted)] text-[var(--ops-accent)] rounded-[var(--ops-radius-lg)] flex items-center justify-center mb-6">
            <Icon name="home" size={28} />
          </div>
          <h2 className="text-[20px] font-bold text-[var(--ops-text)] mb-2">No properties yet</h2>
          <p className="text-[15px] text-[var(--ops-text-secondary)] text-center max-w-md mb-8">
            Start building your development by adding properties to the workspace.
          </p>
          <Link href="/dashboard/development">
            <Button variant="primary" size="lg" className="rounded-full px-8">
              <Icon name="plus" size={18} />
              Add your first property
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6 lg:gap-8 max-w-6xl">
          <HubKpiCards summary={summary} loading={loading} />
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8 items-start">
            <div className="xl:col-span-2">
              <PortfolioList assets={assets} statuses={statuses} loading={loading} />
            </div>
            <div className="xl:col-span-1">
              <StatusDistribution summary={summary} />
            </div>
          </div>
        </div>
      )}

      {!loading && error ? (
        <div className="rounded-[var(--ops-radius-xl)] border border-[var(--ops-danger-muted)] bg-[var(--ops-surface)] p-6 shadow-sm">
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
    <section className="rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] bg-[var(--ops-surface)] shadow-[var(--ops-shadow-sm)] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--ops-border-subtle)] px-6 py-5 bg-[var(--ops-surface)]">
        <div>
          <h2 className="text-[18px] font-bold text-[var(--ops-text)]">
            Properties
          </h2>
          <p className="text-[14px] text-[var(--ops-text-secondary)] mt-0.5">
            {assets.length} total units
          </p>
        </div>
      </div>
      <ul className="divide-y divide-[var(--ops-border-subtle)] max-h-[600px] overflow-y-auto">
        {assets.map((asset) => {
          const status = asset.asset_status_id
            ? statusById.get(asset.asset_status_id)
            : undefined;
          const concept = legendConceptForStatus(status?.slug);
          const capacity = asset.metadata.capacity ?? asset.metadata.pax;
          const placed = asset.metadata.placed;
          return (
            <li key={asset.id} className="group">
              <Link
                href={`/dashboard/properties/${asset.id}`}
                className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-[var(--ops-surface-hover)] transition-colors"
              >
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-[var(--ops-text)] group-hover:text-[var(--ops-accent-hover)] transition-colors">
                    {asset.code ? <span className="text-[var(--ops-text-muted)] mr-1.5">{asset.code}</span> : null}
                    {asset.name}
                  </p>
                  <p className="truncate text-[13px] text-[var(--ops-text-secondary)] mt-1">
                    {capacity != null && capacity !== ""
                      ? `Capacity ${String(capacity)}`
                      : "No capacity set"}
                    {placed != null && placed !== ""
                      ? <><span className="mx-1.5 text-[var(--ops-border-strong)]">•</span>Placed {String(placed)}</>
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex shrink-0 items-center gap-2 rounded-full px-2.5 py-1 text-[12px] font-medium" style={{ backgroundColor: HUB_LEGEND_COLORS[concept] + '15', color: HUB_LEGEND_COLORS[concept] }}>
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: HUB_LEGEND_COLORS[concept] }}
                    />
                    {concept}
                  </span>
                  <Icon name="chevron-right" size={16} className="text-[var(--ops-text-muted)] group-hover:text-[var(--ops-accent)] opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
