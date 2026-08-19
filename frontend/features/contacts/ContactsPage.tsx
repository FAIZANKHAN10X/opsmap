"use client";

import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { listAssets } from "@/services/assets";
import { useShell } from "@/stores/shell-context";
import type { Asset } from "@/types/domain";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; assets: Asset[] };

type Contact = {
  name: string;
  ownedVillas: Asset[];
  assignedVillas: Asset[];
};

export function ContactsPage() {
  const { selectedProjectId, demoMode } = useShell();
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!selectedProjectId && !demoMode) return;
    let cancelled = false;

    listAssets({ project_id: demoMode ? undefined : (selectedProjectId ?? undefined), limit: 100 }, demoMode)
      .then((res) => {
        if (cancelled) return;
        setLoadState({ status: "ready", assets: res.data });
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
  }, [selectedProjectId, demoMode]);

  const contacts = useMemo<Contact[]>(() => {
    if (loadState.status !== "ready") return [];
    const map = new Map<string, Contact>();
    for (const asset of loadState.assets) {
      if (asset.owner?.trim()) {
        const name = asset.owner.trim();
        const contact = map.get(name) ?? { name, ownedVillas: [], assignedVillas: [] };
        contact.ownedVillas.push(asset);
        map.set(name, contact);
      }
      for (const assignee of asset.assignees) {
        if (!assignee.trim()) continue;
        const name = assignee.trim();
        const contact = map.get(name) ?? { name, ownedVillas: [], assignedVillas: [] };
        contact.assignedVillas.push(asset);
        map.set(name, contact);
      }
    }
    
    let result = [...map.values()];
    
    if (search.trim()) {
      const query = search.toLowerCase().trim();
      result = result.filter(c => c.name.toLowerCase().includes(query));
    }
    
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [loadState, search]);

  if (!selectedProjectId && !demoMode) {
    return (
      <div className="flex h-full items-center justify-center p-6 bg-[var(--ops-bg)]">
        <EmptyState
          title="No development selected"
          description="Select a development to view its contacts."
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--ops-bg)]">
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ops-text)]">
              Contacts
            </h1>
            <p className="text-[15px] text-[var(--ops-text-secondary)] mt-1.5">
              People referenced on properties for this development.
            </p>
          </div>
          
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
              className="h-10 w-full sm:w-64 rounded-full border border-transparent bg-white shadow-sm py-2 pr-4 pl-10 text-[14px] text-[var(--ops-text)] placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-border-subtle)] focus:outline-none focus:ring-4 focus:ring-[var(--ops-accent-muted)] transition-all"
            />
          </label>
        </div>

        {loadState.status === "loading" ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-[var(--ops-radius-xl)]" />
            ))}
          </div>
        ) : null}

        {loadState.status === "error" ? (
          <div className="bg-white p-6 rounded-[var(--ops-radius-xl)] shadow-sm">
            <ErrorState message={loadState.message} />
          </div>
        ) : null}

        {loadState.status === "ready" && contacts.length === 0 && search === "" ? (
          <div className="bg-white p-12 rounded-[var(--ops-radius-xl)] shadow-sm">
            <EmptyState
              title="NO CONTACTS"
              description="Assign owners or assignees on properties to build your contact list."
            />
          </div>
        ) : null}

        {loadState.status === "ready" && contacts.length === 0 && search !== "" ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[var(--ops-radius-xl)] shadow-sm border border-[var(--ops-border-subtle)]">
            <Icon name="search" size={32} className="text-[var(--ops-text-muted)] mb-3" />
            <p className="text-[15px] font-semibold text-[var(--ops-text)]">No contacts found</p>
            <p className="text-[14px] text-[var(--ops-text-secondary)] mt-1">Try a different search term.</p>
          </div>
        ) : null}

        {loadState.status === "ready" && contacts.length > 0 ? (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contacts.map((contact) => {
              const villas = [
                ...contact.ownedVillas.map((a) => ({ role: "Owner", asset: a })),
                ...contact.assignedVillas.map((a) => ({ role: "Assigned", asset: a })),
              ];
              return (
                <li key={contact.name} className="flex flex-col bg-white rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] shadow-[var(--ops-shadow-sm)] p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-[var(--ops-surface-hover)] text-[var(--ops-text-secondary)] flex items-center justify-center font-bold text-[14px]">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-[16px] font-bold text-[var(--ops-text)]">
                      {contact.name}
                    </p>
                  </div>
                  <div className="flex-1 bg-[var(--ops-bg)] rounded-[var(--ops-radius-lg)] p-4 border border-[var(--ops-border-subtle)]">
                    <p className="text-[11px] font-bold tracking-wider text-[var(--ops-text-muted)] uppercase mb-2 px-1">
                      Associated Properties
                    </p>
                    <ul className="space-y-1.5">
                      {villas.map(({ role, asset }, i) => (
                        <li
                          key={`${role}-${asset.id}-${i}`}
                          className="flex items-center gap-3 text-[13px] bg-white px-3 py-2 rounded-md shadow-sm border border-[var(--ops-border-subtle)]"
                        >
                          <span className="w-16 shrink-0 font-semibold text-[var(--ops-text-muted)]">
                            {role}
                          </span>
                          <span className="truncate font-medium text-[var(--ops-text)]">{asset.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
