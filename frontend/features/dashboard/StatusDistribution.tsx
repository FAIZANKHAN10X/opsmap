"use client";

import type { ProjectSummary } from "@/types/domain";

type StatusDistributionProps = {
  summary: ProjectSummary | null;
};

/**
 * DASHBOARD status distribution (Phase 15 Step 3). Renders the per-status
 * breakdown from the same `ProjectSummary` aggregation that drives the KPI
 * cards — no separate data path. Replaces the map/list workspace on
 * /dashboard, which now focuses on the business/operations overview.
 */
export function StatusDistribution({ summary }: StatusDistributionProps) {
  if (!summary) return null;

  const maxCount = Math.max(1, ...summary.by_status.map((s) => s.count));

  return (
    <section className="rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-surface)] px-4 py-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold tracking-wide text-[var(--ops-text-muted)] uppercase">
          Status Distribution
        </h2>
        <p className="text-xs text-[var(--ops-text-muted)]">
          {summary.total_assets} total
        </p>
      </div>

      {summary.by_status.length === 0 ? (
        <p className="text-sm text-[var(--ops-text-secondary)]">
          No status data for this development yet.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {summary.by_status.map((row) => (
            <li key={row.status_id}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 font-medium text-[var(--ops-text)]">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: row.color }}
                  />
                  <span className="truncate">{row.status_name}</span>
                </span>
                <span className="font-mono text-xs text-[var(--ops-text-secondary)]">
                  {row.count}
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--ops-bg)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round((row.count / maxCount) * 100)}%`,
                    backgroundColor: row.color,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}