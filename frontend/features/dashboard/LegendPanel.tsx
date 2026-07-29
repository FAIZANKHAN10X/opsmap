"use client";

import { statusColor } from "@/lib/status-colors";
import type { AssetStatus, ProjectSummary } from "@/types/domain";

type LegendPanelProps = {
  statuses: AssetStatus[];
  summary: ProjectSummary | null;
};

export function LegendPanel({ statuses, summary }: LegendPanelProps) {
  const countBySlug = new Map(
    summary?.by_status.map((s) => [s.status_slug, s.count]) ?? [],
  );

  return (
    <div className="rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-surface)]/95 p-3 shadow-[var(--ops-shadow-sm)] backdrop-blur-sm">
      <p className="mb-2 text-[10px] font-semibold tracking-[0.14em] text-[var(--ops-text-muted)] uppercase">
        Legend
      </p>
      <ul className="space-y-1.5">
        {statuses.map((status) => {
          const color = statusColor(status.slug, status.color);
          const count = countBySlug.get(status.slug);
          return (
            <li
              key={status.id}
              className="flex items-center gap-2 text-xs text-[var(--ops-text-secondary)]"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm ring-1 ring-black/20"
                style={{ backgroundColor: color }}
              />
              <span className="min-w-0 flex-1 truncate">{status.name}</span>
              {typeof count === "number" ? (
                <span className="font-mono text-[var(--ops-text-muted)]">
                  {count}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
