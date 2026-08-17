"use client";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { statusColor } from "@/lib/status-colors";
import { useShell } from "@/stores/shell-context";
import type { AssetStatus, AssetType } from "@/types/domain";

type FilterControlsProps = {
  statuses: AssetStatus[];
  types: AssetType[];
};

export function FilterControls({ statuses, types }: FilterControlsProps) {
  const { filters, toggleStatusFilter, toggleTypeFilter, clearFilters, setSearch } =
    useShell();
  const hasFilters =
    filters.statusSlugs.length > 0 ||
    filters.typeSlugs.length > 0 ||
    filters.search.trim().length > 0;

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

      {/* Type filters */}
      {types.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="ml-1 text-xs font-medium text-[var(--ops-text-muted)]">
            Type
          </span>
          {types.map((type) => {
            const active = filters.typeSlugs.includes(type.slug);
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => toggleTypeFilter(type.slug)}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors",
                  active
                    ? "border-transparent bg-[var(--ops-accent)] text-[var(--ops-text-inverse)]"
                    : "border-[var(--ops-border)] bg-[var(--ops-surface)] text-[var(--ops-text-secondary)] hover:border-[var(--ops-border-strong)]",
                )}
                aria-pressed={active}
              >
                {type.name}
              </button>
            );
          })}
        </div>
      ) : null}

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
