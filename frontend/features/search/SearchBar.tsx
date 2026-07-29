"use client";

import { Icon } from "@/components/ui/Icon";
import { useShell } from "@/stores/shell-context";

export function SearchBar() {
  const { filters, setSearch } = useShell();

  return (
    <label className="relative hidden min-w-0 flex-1 md:block md:max-w-md">
      <span className="sr-only">Search assets</span>
      <Icon
        name="search"
        size={15}
        className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[var(--ops-text-muted)]"
      />
      <input
        type="search"
        value={filters.search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search assets…"
        className="h-9 w-full rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-surface)] py-2 pr-3 pl-8 text-sm text-[var(--ops-text)] placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--ops-accent)]"
      />
    </label>
  );
}
