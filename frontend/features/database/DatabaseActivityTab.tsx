"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { contactTypeLabel } from "@/features/contacts/contactMeta";
import { listAssets } from "@/services/assets";
import { listContacts } from "@/services/contacts";
import { listDocuments } from "@/services/documents";
import { useShell } from "@/stores/shell-context";
import type { Asset, Contact, Document } from "@/types/domain";

type ActivityItem = {
  kind: "property" | "contact" | "document";
  title: string;
  subtitle: string;
  href: string;
  updatedAt: string;
};

function ts(value: string): number {
  const t = Date.parse(value);
  return Number.isNaN(t) ? 0 : t;
}

function formatWhen(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * DATABASE → Activity (Phase 3).
 *
 * Read-only "recent changes" timeline derived from the existing source-of-truth
 * records (assets, contacts, documents) via their `created_at`/`updated_at`
 * timestamps. There is intentionally no new activity/event system — the
 * durable, immutable audit log remains a roadmap item; this view surfaces
 * record-level recency from data that already exists.
 */
export function DatabaseActivityTab() {
  const { demoMode, refreshKey } = useShell();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(async () => {
    const [assetRes, contactRes, docRes] = await Promise.all([
      listAssets({ limit: 100 }, demoMode),
      listContacts({ limit: 100 }, demoMode),
      listDocuments({ limit: 100 }),
    ]);

    const docAssets =
      demoMode
        ? new Set(assetRes.data.map((a: Asset) => a.id))
        : null;
    const visibleDocs = docAssets
      ? docRes.data.filter((d: Document) => docAssets.has(d.asset_id))
      : docRes.data;

    const entries: ActivityItem[] = [
      ...assetRes.data.map((a: Asset) => ({
        kind: "property" as const,
        title: a.name,
        subtitle: [a.code, a.owner].filter(Boolean).join(" · ") || "Property",
        href: `/dashboard/properties/${a.id}`,
        updatedAt: a.updated_at,
      })),
      ...contactRes.data.map((c: Contact) => ({
        kind: "contact" as const,
        title: c.full_name,
        subtitle: contactTypeLabel(c.type),
        href: `/dashboard/contacts/${c.id}`,
        updatedAt: c.updated_at,
      })),
      ...visibleDocs.map((d: Document) => ({
        kind: "document" as const,
        title: d.name,
        subtitle: d.category,
        href: `/dashboard/properties/${d.asset_id}`,
        updatedAt: d.updated_at,
      })),
    ];

    return entries
      .sort((a, b) => ts(b.updatedAt) - ts(a.updatedAt))
      .slice(0, 30);
  }, [demoMode]);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((entries) => {
        if (cancelled) return;
        setItems(entries);
        setError(null);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || "Failed to load activity.");
        setItems([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load, refreshKey, reloadToken]);

  function reload() {
    setLoading(true);
    setReloadToken((n) => n + 1);
  }

  const kindMeta: Record<ActivityItem["kind"], { icon: IconName; label: string }> = {
    property: { icon: "grid", label: "Property" },
    contact: { icon: "users", label: "Contact" },
    document: { icon: "file", label: "Document" },
  };

  return (
    <div className="flex h-full min-h-0 flex-col p-4 md:p-8">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p className="text-[12px] font-medium text-[var(--ops-text-muted)]">
          Recent changes across properties, contacts and documents. Read-only —
          the durable audit log remains a roadmap item.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] bg-white shadow-sm">
        {loading ? (
          <div className="space-y-4 p-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-[var(--ops-radius-lg)]" />
            ))}
          </div>
        ) : null}

        {!loading && error ? (
          <div className="p-6">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : null}

        {!loading && !error && items.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="NO RECENT ACTIVITY"
              description="Changes to properties, contacts and documents will appear here."
            />
          </div>
        ) : null}

        {!loading && !error && items.length > 0 ? (
          <ul className="divide-y divide-[var(--ops-border-subtle)]">
            {items.map((item) => {
              const meta = kindMeta[item.kind];
              return (
                <li key={`${item.kind}:${item.title}:${item.updatedAt}`}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-[var(--ops-surface-hover)]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--ops-surface-hover)] text-[var(--ops-text-secondary)]">
                      <Icon name={meta.icon} size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-[var(--ops-text)]">
                        {item.title}
                      </p>
                      <p className="truncate text-[12px] capitalize text-[var(--ops-text-secondary)]">
                        {meta.label} · {item.subtitle}
                      </p>
                    </div>
                    <time className="shrink-0 font-mono text-[12px] text-[var(--ops-text-muted)]">
                      {formatWhen(item.updatedAt)}
                    </time>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}