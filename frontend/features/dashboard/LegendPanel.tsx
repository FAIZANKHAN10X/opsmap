"use client";

import {
  HUB_LEGEND_COLORS,
  HUB_LEGEND_ORDER,
  legendConceptForStatus,
  type HubLegendConcept,
} from "@/lib/hub-status";
import type { ProjectSummary } from "@/types/domain";

type LegendPanelProps = {
  summary: ProjectSummary | null;
};

/**
 * 8AM HUB map legend (Phase 11). The four concepts (OPEN / FILLING /
 * SOLD OUT / NO OPS DATA) are derived from the configurable status engine
 * via the hub-status mapping, and counts come from real summary data.
 */
export function LegendPanel({ summary }: LegendPanelProps) {
  const countByConcept = new Map<HubLegendConcept, number>();
  for (const concept of HUB_LEGEND_ORDER) countByConcept.set(concept, 0);
  for (const row of summary?.by_status ?? []) {
    const concept = legendConceptForStatus(row.status_slug);
    countByConcept.set(concept, (countByConcept.get(concept) ?? 0) + row.count);
  }

  return (
    <div className="rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-surface)]/95 p-3 shadow-[var(--ops-shadow-sm)] backdrop-blur-sm">
      <p className="mb-2 text-[10px] font-semibold tracking-[0.14em] text-[var(--ops-text-muted)] uppercase">
        Legend
      </p>
      <ul className="space-y-1.5">
        {HUB_LEGEND_ORDER.map((concept) => (
          <li
            key={concept}
            className="flex items-center gap-2 text-xs text-[var(--ops-text-secondary)]"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm ring-1 ring-black/20"
              style={{ backgroundColor: HUB_LEGEND_COLORS[concept] }}
            />
            <span className="min-w-0 flex-1 truncate">{concept}</span>
            <span className="font-mono text-[var(--ops-text-muted)]">
              {countByConcept.get(concept) ?? 0}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}