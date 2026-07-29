"use client";

import { useCallback, useEffect, useState } from "react";

import { FilterControls } from "@/features/dashboard/FilterControls";
import { InfoPanel } from "@/features/dashboard/InfoPanel";
import { MapContainer } from "@/features/dashboard/MapContainer";
import { StatusSummaryCards } from "@/features/dashboard/StatusSummaryCards";
import { listAssets } from "@/services/assets";
import { getProjectSummary, listAssetStatuses } from "@/services/dashboard";
import { listAssetTypes } from "@/services/asset-types";
import { useShell } from "@/stores/shell-context";
import type {
  Asset,
  AssetStatus,
  AssetType,
  ProjectSummary,
} from "@/types/domain";
import type { AssetFilterState } from "@/types/ui";

export function DashboardWorkspace() {
  const { selectedProjectId, filters } = useShell();
  const [statuses, setStatuses] = useState<AssetStatus[]>([]);
  const [types, setTypes] = useState<AssetType[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listAssetStatuses(), listAssetTypes()])
      .then(([statusRes, typeRes]) => {
        if (cancelled) return;
        setStatuses(statusRes.data);
        setTypes(typeRes.data);
      })
      .catch(() => {
        if (cancelled) return;
        setStatuses([]);
        setTypes([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!selectedProjectId) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-[var(--ops-text-secondary)]">
        Select a project to open the workspace.
      </div>
    );
  }

  return (
    <ProjectWorkspace
      key={selectedProjectId}
      projectId={selectedProjectId}
      filters={filters}
      statuses={statuses}
      types={types}
    />
  );
}

type ProjectWorkspaceProps = {
  projectId: string;
  filters: AssetFilterState;
  statuses: AssetStatus[];
  types: AssetType[];
};

function ProjectWorkspace({
  projectId,
  filters,
  statuses,
  types,
}: ProjectWorkspaceProps) {
  const { setSelectedAssetId } = useShell();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setReloadToken((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [assetsRes, summaryRes] = await Promise.all([
          listAssets({
            project_id: projectId,
            search: filters.search || undefined,
            status_slugs:
              filters.statusSlugs.length > 0 ? filters.statusSlugs : undefined,
          }),
          getProjectSummary(projectId),
        ]);
        if (cancelled) return;
        setAssets(assetsRes.data);
        setSummary(summaryRes.data);
        setError(null);
        setSelectedAssetId(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load workspace.");
        setAssets([]);
        setSummary(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    // Remount sets loading true via useState; reloads need the flag again.
    // Queue async work without synchronous setState in the effect body.
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      void load();
    });

    return () => {
      cancelled = true;
    };
  }, [projectId, filters.search, filters.statusSlugs, reloadToken, setSelectedAssetId]);

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-hidden p-3 lg:p-4">
        <StatusSummaryCards summary={summary} loading={loading} />
        <FilterControls statuses={statuses} />
        <MapContainer
          assets={assets}
          statuses={statuses}
          types={types}
          summary={summary}
          loading={loading}
          error={error}
          onRetry={reload}
        />
      </div>
      <InfoPanel assets={assets} />
    </div>
  );
}
