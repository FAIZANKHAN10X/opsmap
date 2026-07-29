"use client";

import { KpiCardSkeleton } from "@/components/feedback/LoadingBlock";
import { statusColor } from "@/lib/status-colors";
import type { ProjectSummary } from "@/types/domain";

type StatusSummaryCardsProps = {
  summary: ProjectSummary | null;
  loading: boolean;
};

export function StatusSummaryCards({ summary, loading }: StatusSummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const cards = [
    {
      key: "total",
      label: "Total Assets",
      value: summary.total_assets,
      color: "var(--ops-accent)",
    },
    ...summary.by_status.map((row) => ({
      key: row.status_slug,
      label: row.status_name,
      value: row.count,
      color: statusColor(row.status_slug, row.color),
    })),
  ].slice(0, 6);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <div
          key={card.key}
          className="rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-surface)] px-3 py-3"
        >
          <div className="mb-2 flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: card.color }}
              aria-hidden
            />
            <p className="truncate text-[11px] font-medium tracking-wide text-[var(--ops-text-muted)] uppercase">
              {card.label}
            </p>
          </div>
          <p className="font-mono text-2xl font-semibold tracking-tight text-[var(--ops-text)]">
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
