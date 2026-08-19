"use client";

import { KpiCardSkeleton } from "@/components/feedback/LoadingBlock";
import type { ProjectSummary } from "@/types/domain";

type HubKpiCardsProps = {
  summary: ProjectSummary | null;
  loading: boolean;
};

export function HubKpiCards({ summary, loading }: HubKpiCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
    <div className="grid grid-cols-2 gap-4 sm:gap-6 sm:grid-cols-4">
      <div className="rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] bg-[var(--ops-surface)] p-5 shadow-[var(--ops-shadow-sm)] hover:shadow-md transition-shadow duration-300">
        <p className="mb-3 text-[13px] font-semibold text-[var(--ops-text-muted)] tracking-wide uppercase">
          Placed (OPS)
        </p>
        <p className="text-3xl font-bold tracking-tight text-[var(--ops-text)]">
          {placed}
          <span className="ml-1.5 text-[14px] font-semibold text-[var(--ops-text-muted)] lowercase">
            pax
          </span>
        </p>
      </div>
      <div className="rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] bg-[var(--ops-surface)] p-5 shadow-[var(--ops-shadow-sm)] hover:shadow-md transition-shadow duration-300">
        <p className="mb-3 text-[13px] font-semibold text-[var(--ops-text-muted)] tracking-wide uppercase">
          Total Capacity
        </p>
        <p className="text-3xl font-bold tracking-tight text-[var(--ops-text)]">
          {kpis.villa_capacity}
        </p>
      </div>
      <div className="rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] bg-[var(--ops-surface)] p-5 shadow-[var(--ops-shadow-sm)] hover:shadow-md transition-shadow duration-300">
        <p className="mb-3 text-[13px] font-semibold text-[var(--ops-info)] tracking-wide uppercase">
          Spots Open
        </p>
        <p className="text-3xl font-bold tracking-tight text-[var(--ops-text)]">
          {kpis.spots_open}
        </p>
      </div>
      <div className="rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] bg-[var(--ops-surface)] p-5 shadow-[var(--ops-shadow-sm)] hover:shadow-md transition-shadow duration-300">
        <p className="mb-3 text-[13px] font-semibold text-[var(--ops-text-muted)] tracking-wide uppercase">
          Units Sold
        </p>
        <p className="text-3xl font-bold tracking-tight text-[var(--ops-text)]">
          {kpis.villas_sold_out} <span className="text-[18px] text-[var(--ops-text-muted)]">/ {kpis.total_villas}</span>
        </p>
      </div>
    </div>
  );
}
