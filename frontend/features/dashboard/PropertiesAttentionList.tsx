"use client";

import Link from "next/link";

import { Icon } from "@/components/ui/Icon";

type Item = {
  id: string;
  name: string;
  code: string | null;
  statusSlug: string | null;
  statusName: string | null;
  issues: string[];
  updatedAt: string;
};

type Props = {
  items: Item[];
  loading?: boolean;
};

export function PropertiesAttentionList({ items, loading }: Props) {
  if (loading) {
    return (
      <section className="rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] bg-white p-6 shadow-sm">
        <div className="h-5 w-48 rounded bg-[var(--ops-surface-hover)] animate-pulse" />
        <div className="mt-4 space-y-3">
          <div className="h-12 rounded-lg bg-[var(--ops-surface-hover)] animate-pulse" />
          <div className="h-12 rounded-lg bg-[var(--ops-surface-hover)] animate-pulse" />
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-[var(--ops-text)]">Properties requiring attention</h3>
        <p className="mt-2 text-xs text-[var(--ops-text-muted)]">No properties match the current attention rules.</p>
      </section>
    );
  }

  return (
    <section className="rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--ops-border-subtle)]">
        <div>
          <h3 className="text-sm font-semibold text-[var(--ops-text)]">Properties requiring attention</h3>
          <p className="text-xs text-[var(--ops-text-muted)]">{items.length} {items.length === 1 ? "property" : "properties"}</p>
        </div>
        <Link href="/dashboard/development" className="text-xs font-medium text-[var(--ops-accent)] hover:underline">
          Open workspace
        </Link>
      </div>
      <ul className="divide-y divide-[var(--ops-border-subtle)]">
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-3 px-6 py-3 hover:bg-[var(--ops-surface-hover)] transition-colors">
            <div className="min-w-0 flex-1">
              <Link href={`/dashboard/properties/${it.id}`} className="group">
                <p className="truncate text-sm font-medium text-[var(--ops-text)] group-hover:text-[var(--ops-accent)]">
                  {it.code ? <span className="font-mono text-xs text-[var(--ops-text-muted)] mr-1.5">{it.code}</span> : null}
                  {it.name}
                </p>
              </Link>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {it.issues.map((iss) => (
                  <span key={iss} className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-200">
                    {iss}
                  </span>
                ))}
              </div>
            </div>
            <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
              {it.statusName ? (
                <span className="text-xs text-[var(--ops-text-secondary)]">{it.statusName}</span>
              ) : null}
              <Link href={`/dashboard/properties/${it.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-[var(--ops-accent)] hover:underline">
                View <Icon name="chevron-right" size={12} />
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
