"use client";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { statusColor } from "@/lib/status-colors";
import { useShell } from "@/stores/shell-context";
import type { AssetStatus } from "@/types/domain";

type FilterControlsProps = {
  statuses: AssetStatus[];
};

export function FilterControls({ statuses }: FilterControlsProps) {
  const { filters, toggleStatusFilter, clearFilters, setSearch } = useShell();
  const hasFilters =
    filters.statusSlugs.length > 0 || filters.search.trim().length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--ops-text-muted)]">
        <Icon name="filter" size={14} />
        Filters
      </div>

      <div className="flex flex-wrap gap-1.5">
        {statuses.map((status) => {
          const active = filters.statusSlugs.includes(status.slug);
          const color = statusColor(status.slug, status.color);
          return (
            <button
              key={status.id}
              type="button"
              onClick={() => toggleStatusFilter(status.slug)}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors",
                active
                  ? "border-transparent text-[var(--ops-text-inverse)]"
                  : "border-[var(--ops-border)] bg-[var(--ops-surface)] text-[var(--ops-text-secondary)] hover:border-[var(--ops-border-strong)]",
              )}
              style={
                active
                  ? { backgroundColor: color, borderColor: color }
                  : undefined
              }
              aria-pressed={active}
            >
              {!active ? (
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
              ) : null}
              {status.name}
            </button>
          );
        })}
      </div>

      {/* Mobile search */}
      <label className="relative w-full md:hidden">
        <span className="sr-only">Search assets</span>
        <Icon
          name="search"
          size={14}
          className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[var(--ops-text-muted)]"
        />
        <input
          type="search"
          value={filters.search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search assets…"
          className="h-8 w-full rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-surface)] py-1.5 pr-3 pl-8 text-sm text-[var(--ops-text)] placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-accent)] focus:outline-none"
        />
      </label>

      {hasFilters ? (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          Clear
        </Button>
      ) : null}
    </div>
  );
}
