"use client";

import Link from "next/link";

import { Icon } from "@/components/ui/Icon";
import type { RecentActivityItem } from "@/types/domain";

type Props = {
  items: RecentActivityItem[];
  loading?: boolean;
};

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export function RecentActivity({ items, loading }: Props) {
  if (loading) {
    return (
      <section className="rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] bg-white p-6 shadow-sm">
        <div className="h-5 w-32 rounded bg-[var(--ops-surface-hover)] animate-pulse" />
        <div className="mt-4 space-y-3">
          <div className="h-10 rounded-lg bg-[var(--ops-surface-hover)] animate-pulse" />
          <div className="h-10 rounded-lg bg-[var(--ops-surface-hover)] animate-pulse" />
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-[var(--ops-text)]">Recent Activity</h3>
        <p className="mt-2 text-xs text-[var(--ops-text-muted)]">
          No recent changes. Activity appears here when properties, contacts, or documents are created or updated.
        </p>
        <p className="mt-3 text-[11px] text-[var(--ops-text-muted)]">Derived from record timestamps — not an audited history (roadmap).</p>
      </section>
    );
  }

  return (
    <section className="rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--ops-border-subtle)]">
        <h3 className="text-sm font-semibold text-[var(--ops-text)]">Recent Activity</h3>
        <p className="text-xs text-[var(--ops-text-muted)]">Latest property, contact, and document updates</p>
      </div>
      <ul className="divide-y divide-[var(--ops-border-subtle)]">
        {items.map((it) => (
          <li key={`${it.kind}-${it.id}`} className="flex items-center gap-3 px-6 py-3 hover:bg-[var(--ops-surface-hover)]">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ops-surface-hover)] text-[var(--ops-text-muted)]">
              <Icon name={it.kind === "property" ? "pin" : it.kind === "contact" ? "users" : "file"} size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <Link href={it.href} className="truncate text-sm font-medium text-[var(--ops-text)] hover:text-[var(--ops-accent)]">
                {it.title}
              </Link>
              <p className="truncate text-xs text-[var(--ops-text-muted)]">{it.subtitle}</p>
            </div>
            <span className="shrink-0 text-xs text-[var(--ops-text-muted)]">{timeAgo(it.updatedAt)}</span>
          </li>
        ))}
      </ul>
      <p className="px-6 py-3 text-[11px] text-[var(--ops-text-muted)] border-t border-[var(--ops-border-subtle)]">Derived from record timestamps — not an audited history.</p>
    </section>
  );
}
