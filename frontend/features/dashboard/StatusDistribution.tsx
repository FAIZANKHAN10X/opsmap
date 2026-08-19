"use client";

import type { ProjectSummary } from "@/types/domain";

type StatusDistributionProps = {
  summary: ProjectSummary | null;
};

export function StatusDistribution({ summary }: StatusDistributionProps) {
  if (!summary) return null;

  const maxCount = Math.max(1, ...summary.by_status.map((s) => s.count));

  return (
    <section className="rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] bg-[var(--ops-surface)] p-6 shadow-[var(--ops-shadow-sm)] flex flex-col h-full">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-bold text-[var(--ops-text)]">
            Status
          </h2>
          <p className="text-[14px] text-[var(--ops-text-secondary)] mt-0.5">
            {summary.total_assets} properties
          </p>
        </div>
      </div>

      {summary.by_status.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[15px] text-[var(--ops-text-muted)] text-center">
            No status data yet.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {summary.by_status.map((row) => (
            <li key={row.status_id} className="group">
              <div className="flex items-center justify-between gap-3 text-[14px] mb-2">
                <span className="flex min-w-0 items-center gap-2.5 font-semibold text-[var(--ops-text)]">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: row.color }}
                  />
                  <span className="truncate">{row.status_name}</span>
                </span>
                <span className="font-semibold text-[15px] text-[var(--ops-text)]">
                  {row.count}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--ops-bg)]">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
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
