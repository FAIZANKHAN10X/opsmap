"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { ContactForm } from "@/features/contacts/ContactForm";
import { contactTypeLabel, roleLabel } from "@/features/contacts/contactMeta";
import { listAssets } from "@/services/assets";
import { createContact, listContacts } from "@/services/contacts";
import { useShell } from "@/stores/shell-context";
import { useToast } from "@/stores/toast-context";
import { usePermissions } from "@/stores/user-context";
import {
  CONTACT_TYPES,
  type Asset,
  type Contact,
  type ContactCreateInput,
  type ContactUpdateInput,
} from "@/types/domain";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; contacts: Contact[] };

export function ContactsPage() {
  const toast = useToast();
  const { demoMode, refreshKey, bumpRefresh } = useShell();
  const { canEdit } = usePermissions();
  const canMutate = canEdit && !demoMode;

  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);

  const runQuery = useCallback(() => {
    return listContacts(
      { page: 1, limit: 100, search, type: typeFilter || undefined },
      demoMode,
    );
  }, [demoMode, search, typeFilter]);

  useEffect(() => {
    let cancelled = false;
    runQuery()
      .then((res) => {
        if (!cancelled) setLoadState({ status: "ready", contacts: res.data });
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setLoadState({
            status: "error",
            message: err.message || "Failed to load contacts.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [runQuery, refreshKey]);

  function reload() {
    setLoadState({ status: "loading" });
    runQuery()
      .then((res) => setLoadState({ status: "ready", contacts: res.data }))
      .catch((err: Error) =>
        setLoadState({ status: "error", message: err.message || "Failed to load contacts." }),
      );
  }

  async function openCreate() {
    setCreating(true);
    try {
      const res = await listAssets({ limit: 100 }, demoMode);
      setAssets(res.data);
    } catch {
      setAssets([]);
    }
  }

  async function handleCreate(payload: ContactCreateInput | ContactUpdateInput) {
    try {
      await createContact(payload as ContactCreateInput);
      toast.success("Contact created");
      bumpRefresh();
      setCreating(false);
    } catch (err) {
      throw err instanceof Error ? err : new Error("Could not create contact.");
    }
  }

  const contacts = loadState.status === "ready" ? loadState.contacts : [];

  return (
    <div className="h-full overflow-y-auto bg-[var(--ops-bg)]">
      <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ops-text)]">
              Contacts
            </h1>
            <p className="text-[15px] text-[var(--ops-text-secondary)] mt-1.5">
              The people behind your properties — owners, clients, agents,
              vendors and leads.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-2">
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
                placeholder="Search contacts…"
                className="h-10 w-full sm:w-60 rounded-full border border-transparent bg-white shadow-sm py-2 pr-4 pl-10 text-[14px] text-[var(--ops-text)] placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-border-subtle)] focus:outline-none focus:ring-4 focus:ring-[var(--ops-accent-muted)] transition-all"
              />
            </label>
            <label className="relative">
              <span className="sr-only">Filter by type</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-10 rounded-full border border-transparent bg-white shadow-sm px-4 pr-9 text-[14px] text-[var(--ops-text)] focus:border-[var(--ops-border-subtle)] focus:outline-none focus:ring-4 focus:ring-[var(--ops-accent-muted)] transition-all"
              >
                <option value="">All types</option>
                {CONTACT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            {canMutate ? (
              <Button variant="primary" onClick={() => void openCreate()} disabled={creating} className="rounded-full shadow-sm">
                <Icon name="plus" size={16} />
                Add contact
              </Button>
            ) : null}
          </div>
        </div>

        {demoMode ? (
          <p className="inline-flex items-center gap-2 rounded-[var(--ops-radius-lg)] bg-[var(--ops-warning-muted)] px-3 py-2 text-[13px] font-medium text-[var(--ops-warning)]">
            <Icon name="info" size={16} /> Demo Mode is read-only.
          </p>
        ) : null}

        {creating ? (
          <div className="bg-white rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] shadow-sm p-6">
            <ContactForm
              mode="create"
              assets={assets}
              onSubmit={handleCreate}
              onCancel={() => setCreating(false)}
            />
          </div>
        ) : null}

        {loadState.status === "loading" ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-[var(--ops-radius-xl)]" />
            ))}
          </div>
        ) : null}

        {loadState.status === "error" ? (
          <div className="bg-white p-6 rounded-[var(--ops-radius-xl)] shadow-sm">
            <ErrorState message={loadState.message} onRetry={reload} />
          </div>
        ) : null}

        {loadState.status === "ready" && contacts.length === 0 ? (
          <div className="bg-white p-12 rounded-[var(--ops-radius-xl)] shadow-sm">
            <EmptyState
              title={search || typeFilter ? "NO CONTACTS FOUND" : "NO CONTACTS"}
              description={
                search || typeFilter
                  ? "Try a different search term or type filter."
                  : "Add your first contact to start building your network."
              }
              action={
                canMutate && !search && !typeFilter ? (
                  <Button variant="primary" onClick={() => void openCreate()}>
                    <Icon name="plus" size={16} />
                    Add contact
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : null}

        {loadState.status === "ready" && contacts.length > 0 ? (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contacts.map((contact) => (
              <li key={contact.id}>
                <Link
                  href={`/dashboard/contacts/${contact.id}`}
                  className="flex flex-col h-full bg-white rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] shadow-[var(--ops-shadow-sm)] p-5 hover:shadow-md hover:border-[var(--ops-border-strong)] transition-all"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-[var(--ops-surface-hover)] text-[var(--ops-text-secondary)] flex items-center justify-center font-bold text-[14px]">
                      {contact.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[16px] font-bold text-[var(--ops-text)] truncate">
                        {contact.full_name}
                      </p>
                      <p className="text-[12px] text-[var(--ops-text-secondary)] truncate">
                        {contact.company ?? contact.email ?? contact.phone ?? "—"}
                      </p>
                    </div>
                    <span className="ml-auto shrink-0 rounded-full border border-[var(--ops-border)] px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase text-[var(--ops-text-secondary)]">
                      {contactTypeLabel(contact.type)}
                    </span>
                  </div>
                  <div className="flex-1 bg-[var(--ops-bg)] rounded-[var(--ops-radius-lg)] p-4 border border-[var(--ops-border-subtle)]">
                    <p className="text-[11px] font-bold tracking-wider text-[var(--ops-text-muted)] uppercase mb-2 px-1">
                      Associated Properties
                    </p>
                    {contact.properties.length === 0 ? (
                      <p className="px-1 text-[13px] text-[var(--ops-text-muted)]">
                        No associated properties.
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {contact.properties.slice(0, 4).map((link) => (
                          <li
                            key={`${link.asset_id}-${link.role}`}
                            className="flex items-center gap-3 text-[13px] bg-white px-3 py-2 rounded-md shadow-sm border border-[var(--ops-border-subtle)]"
                          >
                            <span className="w-16 shrink-0 font-semibold text-[var(--ops-text-muted)]">
                              {roleLabel(link.role)}
                            </span>
                            <span className="truncate font-medium text-[var(--ops-text)]">
                              {link.asset_name}
                            </span>
                          </li>
                        ))}
                        {contact.properties.length > 4 ? (
                          <li className="px-1 pt-1 text-[12px] font-semibold text-[var(--ops-text-muted)]">
                            +{contact.properties.length - 4} more
                          </li>
                        ) : null}
                      </ul>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}