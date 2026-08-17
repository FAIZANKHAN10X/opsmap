"use client";

import { KpiCardSkeleton } from "@/components/feedback/LoadingBlock";
import type { ProjectSummary } from "@/types/domain";

type HubKpiCardsProps = {
  summary: ProjectSummary | null;
  loading: boolean;
};

/**
 * 8AM HUB dashboard KPI blocks (Phase 11). All values are data-driven:
 * - PLACED (OPS): placed pax / total pax capacity
 * - VILLA CAPACITY: villas carrying capacity
 * - SPOTS OPEN: villas whose status maps to OPEN
 * - VILLAS SOLD OUT: sold villas / total villas
 * See buildProjectSummary (lib/server/services/dashboard.ts) for definitions.
 */
export function HubKpiCards({ summary, loading }: HubKpiCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const kpis = summary.kpis ?? {
    placed: 0,
    placed_capacity: 0,
    villa_capacity: 0,
    spots_open: 0,
    villas_sold_out: 0,
    total_villas: 0,
  };
  const placed =
    kpis.placed_capacity > 0 ? `${kpis.placed} / ${kpis.placed_capacity}` : "—";

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div className="rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-surface)] px-3 py-3">
        <p className="mb-2 truncate text-[11px] font-medium tracking-wide text-[var(--ops-text-muted)] uppercase">
          Placed (OPS)
        </p>
        <p className="font-mono text-2xl font-semibold tracking-tight text-[var(--ops-text)]">
          {placed}
          <span className="ml-1 text-xs font-medium text-[var(--ops-text-muted)]">
            pax
          </span>
        </p>
      </div>
      <div className="rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-surface)] px-3 py-3">
        <p className="mb-2 truncate text-[11px] font-medium tracking-wide text-[var(--ops-text-muted)] uppercase">
          Villa Capacity
        </p>
        <p className="font-mono text-2xl font-semibold tracking-tight text-[var(--ops-text)]">
          {kpis.villa_capacity}
        </p>
      </div>
      <div className="rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-surface)] px-3 py-3">
        <p className="mb-2 truncate text-[11px] font-medium tracking-wide text-[var(--ops-text-muted)] uppercase">
          Spots Open
        </p>
        <p className="font-mono text-2xl font-semibold tracking-tight text-[var(--ops-text)]">
          {kpis.spots_open}
        </p>
      </div>
      <div className="rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-surface)] px-3 py-3">
        <p className="mb-2 truncate text-[11px] font-medium tracking-wide text-[var(--ops-text-muted)] uppercase">
          Villas Sold Out
        </p>
        <p className="font-mono text-2xl font-semibold tracking-tight text-[var(--ops-text)]">
          {kpis.villas_sold_out} / {kpis.total_villas}
        </p>
      </div>
    </div>
  );
}