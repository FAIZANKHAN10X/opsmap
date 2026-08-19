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

/**
 * CONTACTS (Phase 11) — derived from asset owners and assignees. No schema
 * change: the generalized model stays intact and contacts are computed from
 * the people already referenced on properties.
 */
export function ContactsPage() {
  const { selectedProjectId } = useShell();
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (!selectedProjectId) return;
    let cancelled = false;

    listAssets({ project_id: selectedProjectId, limit: 100 })
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
  }, [selectedProjectId]);

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
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [loadState]);

  if (!selectedProjectId) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-[var(--ops-text-secondary)]">
        Select a development to view people named on its properties.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-4 p-4 lg:p-6">
        <div>
          <h1 className="text-lg font-semibold text-[var(--ops-text)]">
            Contacts
          </h1>
          <p className="text-xs text-[var(--ops-text-muted)]">
            People referenced on properties for the selected project
          </p>
        </div>

        {loadState.status === "loading" ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : null}

        {loadState.status === "error" ? (
          <ErrorState message={loadState.message} />
        ) : null}

        {loadState.status === "ready" && contacts.length === 0 ? (
          <EmptyState
            title="NO CONTACTS"
            description="Assign owners or assignees on properties to build your contact list."
          />
        ) : null}

        {loadState.status === "ready" && contacts.length > 0 ? (
          <ul className="divide-y divide-[var(--ops-border)] overflow-hidden rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-surface)]">
            {contacts.map((contact) => {
              const villas = [
                ...contact.ownedVillas.map((a) => ({ role: "Owner", asset: a })),
                ...contact.assignedVillas.map((a) => ({ role: "Assigned", asset: a })),
              ];
              return (
                <li key={contact.name} className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Icon name="users" size={15} className="text-[var(--ops-text-muted)]" />
                    <p className="text-sm font-medium text-[var(--ops-text)]">
                      {contact.name}
                    </p>
                  </div>
                  <ul className="mt-1.5 space-y-1 pl-6">
                    {villas.map(({ role, asset }) => (
                      <li
                        key={`${role}-${asset.id}`}
                        className="flex items-center gap-2 text-xs text-[var(--ops-text-secondary)]"
                      >
                        <span className="w-16 shrink-0 font-medium text-[var(--ops-text-muted)] uppercase">
                          {role}
                        </span>
                        <span className="truncate">{asset.name}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}