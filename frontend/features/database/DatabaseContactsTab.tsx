"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { contactTypeLabel } from "@/features/contacts/contactMeta";
import { listContacts } from "@/services/contacts";
import { useShell } from "@/stores/shell-context";
import { CONTACT_TYPES, type Contact } from "@/types/domain";

/**
 * DATABASE → Contacts (Phase 3).
 *
 * Structured record access over the first-class contacts data model. This is
 * intentionally a lean, table-style browse: full contact management (create/
 * edit/delete) stays in the CONTACTS section; rows open the canonical
 * `/dashboard/contacts/[id]` detail route.
 */
export function DatabaseContactsTab() {
  const { demoMode, refreshKey } = useShell();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(() => {
    return listContacts(
      {
        page: 1,
        limit: 100,
        search: search.trim() || undefined,
        type: typeFilter || undefined,
      },
      demoMode,
    );
  }, [demoMode, search, typeFilter]);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((res) => {
        if (cancelled) return;
        setContacts(res.data);
        setError(null);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || "Failed to load contacts.");
        setContacts([]);
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

  return (
    <div className="flex h-full min-h-0 flex-col p-4 md:p-8">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="relative">
          <span className="sr-only">Search contacts</span>
          <Icon
            name="search"
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ops-text-muted)]"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, company, email…"
            className="h-10 w-full rounded-full border border-transparent bg-white py-2 pl-10 pr-4 text-[14px] text-[var(--ops-text)] shadow-sm placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-border-subtle)] focus:outline-none focus:ring-4 focus:ring-[var(--ops-accent-muted)] transition-all sm:w-64"
          />
        </label>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-10 rounded-full border border-transparent bg-white px-4 pr-9 text-[14px] text-[var(--ops-text)] shadow-sm focus:border-[var(--ops-border-subtle)] focus:outline-none focus:ring-4 focus:ring-[var(--ops-accent-muted)] transition-all"
          aria-label="Filter by type"
        >
          <option value="">All types</option>
          {CONTACT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <p className="ml-auto text-[12px] font-medium text-[var(--ops-text-muted)]">
          Contact management lives in the Contacts section.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] bg-white shadow-sm">
        {loading ? (
          <div className="space-y-4 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-[var(--ops-radius-lg)]" />
            ))}
          </div>
        ) : null}

        {!loading && error ? (
          <div className="p-6">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : null}

        {!loading && !error && contacts.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="NO CONTACTS"
              description={
                search || typeFilter
                  ? "Try a different search term or type filter."
                  : "Contacts created in the Contacts section appear here as structured records."
              }
            />
          </div>
        ) : null}

        {!loading && !error && contacts.length > 0 ? (
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead className="sticky top-0 z-10 border-b border-[var(--ops-border-subtle)] bg-white/95 text-[12px] font-bold tracking-wider text-[var(--ops-text-muted)] uppercase backdrop-blur-sm">
              <tr>
                <th className="px-6 py-4 font-bold">Name</th>
                <th className="px-6 py-4 font-bold">Type</th>
                <th className="px-6 py-4 font-bold">Company</th>
                <th className="px-6 py-4 font-bold">Contact</th>
                <th className="px-6 py-4 font-bold">Properties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ops-border-subtle)]">
              {contacts.map((contact) => (
                <tr key={contact.id} className="transition-colors hover:bg-[var(--ops-surface-hover)]">
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/contacts/${contact.id}`}
                      className="inline-flex items-center gap-2 text-[14px] font-semibold text-[var(--ops-text)] hover:text-[var(--ops-accent-hover)]"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ops-surface-hover)] text-[12px] font-bold text-[var(--ops-text-secondary)]">
                        {contact.full_name.charAt(0).toUpperCase()}
                      </span>
                      <span className="underline-offset-2 group-hover:underline">
                        {contact.full_name}
                      </span>
                      <Icon name="external" size={12} className="text-[var(--ops-text-muted)]" />
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-full border border-[var(--ops-border)] px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase text-[var(--ops-text-secondary)]">
                      {contactTypeLabel(contact.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[14px] text-[var(--ops-text-secondary)]">
                    {contact.company ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-[14px] text-[var(--ops-text-secondary)]">
                    {contact.email ?? contact.phone ?? "—"}
                  </td>
                  <td className="px-6 py-4 font-mono text-[13px] text-[var(--ops-text-secondary)]">
                    {contact.properties.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  );
}