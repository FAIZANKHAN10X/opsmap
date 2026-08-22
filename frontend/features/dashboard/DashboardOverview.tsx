"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { HubKpiCards } from "@/features/dashboard/HubKpiCards";
import { NeedsAttention } from "@/features/dashboard/NeedsAttention";
import { PropertiesAttentionList } from "@/features/dashboard/PropertiesAttentionList";
import { RecentActivity } from "@/features/dashboard/RecentActivity";
import { getDashboardData } from "@/services/dashboard";
import { useShell } from "@/stores/shell-context";
import { useUser } from "@/stores/user-context";
import type { DashboardData } from "@/types/domain";

export function DashboardOverview() {
  const { selectedProjectId, demoMode, refreshKey } = useShell();
  const user = useUser();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    if (!selectedProjectId && !demoMode) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await getDashboardData(selectedProjectId ?? "", demoMode);
        if (cancelled) return;
        setData(res.data);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setData(null);
        setError(err instanceof Error ? err.message : "Failed to load dashboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    void load();
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

  const isEmpty = !loading && !error && data && data.summary.total_assets === 0;

  // Header context
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  })();
  const displayName = user?.fullName || user?.email?.split("@")[0] || null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto p-4 md:p-8 bg-[var(--ops-bg)]">
      {/* Header / context */}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium tracking-widest text-[var(--ops-text-muted)] uppercase">8AM HUB · Internal Operations</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ops-text)]">
              {displayName ? `${greeting}, ${displayName}` : "Dashboard"}
            </h1>
            <p className="text-[15px] text-[var(--ops-text-secondary)] mt-1">
              {demoMode
                ? "Demo — Uluwatu 26 · 16 properties · read-only"
                : data
                  ? `${data.summary.total_assets} ${data.summary.total_assets === 1 ? "property" : "properties"} in this development`
                  : "Business overview for this development"}
            </p>
          </div>
          <Link href="/dashboard/development">
            <Button variant="secondary" size="md" className="rounded-full bg-white shadow-sm">
              Manage properties
              <Icon name="chevron-right" size={16} />
            </Button>
          </Link>
        </div>
      </div>

      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] shadow-sm">
          <div className="w-16 h-16 bg-[var(--ops-accent-muted)] text-[var(--ops-accent)] rounded-xl flex items-center justify-center mb-6">
            <Icon name="home" size={28} />
          </div>
          <h2 className="text-[20px] font-bold text-[var(--ops-text)] mb-2">Your property workspace is ready.</h2>
          <p className="text-[15px] text-[var(--ops-text-secondary)] text-center max-w-md mb-8">
            Add your first property to start tracking operations.
          </p>
          <Link href="/dashboard/development">
            <Button variant="primary" size="lg" className="rounded-full px-8">
              <Icon name="plus" size={18} />
              Add your first property
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6 max-w-6xl">
          {/* Business KPIs */}
          <HubKpiCards summary={data?.summary ?? null} loading={loading} />

          {/* Operational overview + Needs Attention side-by-side on desktop */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            <div className="xl:col-span-2 flex flex-col gap-6">
              <ClickableStatusDistribution summary={data?.summary ?? null} loading={loading} />
            </div>
            <div className="xl:col-span-1">
              <RecentActivity items={data?.recentActivity ?? []} loading={loading} />
            </div>
          </div>

          <NeedsAttention attention={data?.attention ?? null} loading={loading} />

          <PropertiesAttentionList items={data?.attention.propertiesNeedingAttention ?? []} loading={loading} />
        </div>
      )}

      {!loading && error ? (
        <div className="rounded-xl border border-[var(--ops-danger-muted)] bg-white p-6 shadow-sm">
          <ErrorState title="Dashboard failed to load" message={error} onRetry={reload} />
        </div>
      ) : null}
    </div>
  );
}

function ClickableStatusDistribution({ summary, loading }: { summary: import("@/types/domain").ProjectSummary | null; loading?: boolean }) {
  const router = useRouter();
  if (loading) {
    return (
      <section className="rounded-xl border border-[var(--ops-border-subtle)] bg-white p-6 shadow-sm">
        <div className="h-5 w-32 rounded bg-[var(--ops-surface-hover)] animate-pulse" />
        <div className="mt-6 space-y-4">
          <div className="h-8 rounded bg-[var(--ops-surface-hover)] animate-pulse" />
          <div className="h-8 rounded bg-[var(--ops-surface-hover)] animate-pulse" />
        </div>
      </section>
    );
  }
  if (!summary) return null;
  const maxCount = Math.max(1, ...summary.by_status.map((s) => s.count));
  return (
    <section className="rounded-xl border border-[var(--ops-border-subtle)] bg-white p-6 shadow-sm flex flex-col">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[16px] font-bold text-[var(--ops-text)]">Operational overview</h2>
          <p className="text-sm text-[var(--ops-text-secondary)] mt-0.5">{summary.total_assets} properties</p>
        </div>
        <span className="text-xs text-[var(--ops-text-muted)]">Click to filter</span>
      </div>
      {summary.by_status.length === 0 ? (
        <p className="text-sm text-[var(--ops-text-muted)] text-center py-8">No status data yet.</p>
      ) : (
        <ul className="space-y-3">
          {summary.by_status.map((row) => (
            <li key={row.status_id}>
              <button
                type="button"
                onClick={() => {
                  router.push(`/dashboard/development?status=${row.status_slug}`);
                }}
                className="group w-full text-left rounded-lg px-2 py-2 -mx-2 hover:bg-[var(--ops-surface-hover)] transition-colors"
              >
                <div className="flex items-center justify-between gap-3 text-sm mb-1.5">
                  <span className="flex items-center gap-2.5 font-medium text-[var(--ops-text)]">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: row.color }} />
                    {row.status_name}
                  </span>
                  <span className="font-semibold">{row.count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--ops-bg)]">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.round((row.count / maxCount) * 100)}%`, backgroundColor: row.color }} />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
