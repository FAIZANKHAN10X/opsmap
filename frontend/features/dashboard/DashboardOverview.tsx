"use client";

import { useCallback, useEffect, useState } from "react";

import { ErrorState } from "@/components/feedback/ErrorState";
import { HubKpiCards } from "@/features/dashboard/HubKpiCards";
import { StatusDistribution } from "@/features/dashboard/StatusDistribution";
import { getProjectSummary } from "@/services/dashboard";
import { useShell } from "@/stores/shell-context";
import type { ProjectSummary } from "@/types/domain";

/**
 * DASHBOARD (Phase 15 Step 3) — business/operations overview for the selected
 * development: KPI cards + status distribution only. No property map, no villa
 * list workspace, no property CRUD. Reads the same real-data aggregation
 * (`getProjectSummary`) as the ULLUWATU "26 workspace.
 */
export function DashboardOverview() {
  const { selectedProjectId, demoMode, refreshKey } = useShell();
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
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
        const res = await getProjectSummary(selectedProjectId ?? "", demoMode);
        if (cancelled) return;
        setSummary(res.data);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setSummary(null);
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    // Queue async work without synchronous setState in the effect body.
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
      <div className="flex h-full items-center justify-center p-6 text-sm text-[var(--ops-text-secondary)]">
        Select a project to open the dashboard.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3 lg:p-4">
      <HubKpiCards summary={summary} loading={loading} />
      <StatusDistribution summary={summary} />

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