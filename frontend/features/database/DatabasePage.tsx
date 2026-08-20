"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { AssetsPage } from "@/features/assets/AssetsPage";
import { DatabaseActivityTab } from "@/features/database/DatabaseActivityTab";
import { DatabaseContactsTab } from "@/features/database/DatabaseContactsTab";
import { DatabaseDocumentsTab } from "@/features/database/DatabaseDocumentsTab";
import { DatabaseMediaTab } from "@/features/database/DatabaseMediaTab";
import { cn } from "@/lib/cn";
import { useShell } from "@/stores/shell-context";

const TABS = [
  { id: "properties", label: "Properties", icon: "grid" },
  { id: "contacts", label: "Contacts", icon: "users" },
  { id: "documents", label: "Documents", icon: "file" },
  { id: "media", label: "Media", icon: "image" },
  { id: "activity", label: "Activity", icon: "list" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/**
 * DATABASE (Phase 3) — central business-record management.
 *
 * A single page with record-type tabs over the existing data layer:
 * - Properties  → existing asset CRUD (project-scoped, unchanged).
 * - Contacts    → structured read-only browse that links to the canonical
 *                 `/dashboard/contacts/[id]` detail route.
 * - Documents   → global document browse (preview/download) over the existing
 *                 document/storage system; rows link to the owning property.
 * - Media       → property images from the existing document store.
 * - Activity    → read-only recent-changes timeline derived from the existing
 *                 `created_at`/`updated_at` timestamps (no new activity system).
 *
 * No duplicate data systems: every tab reads the same source-of-truth records
 * (assets, contacts, documents) used everywhere else in the app.
 */
export function DatabasePage() {
  const [tab, setTab] = useState<TabId>("properties");
  const { demoMode } = useShell();

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--ops-bg)]">
      <div className="px-4 pb-0 pt-6 md:px-8 md:pt-8">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--ops-text)] sm:text-3xl">
          Database
        </h1>
        <p className="mt-1.5 text-[15px] text-[var(--ops-text-secondary)]">
          Central business records — properties, contacts, documents, media and
          activity.
        </p>

        {demoMode ? (
          <div className="mt-4 flex items-center gap-2 rounded-[var(--ops-radius-lg)] border border-[var(--ops-warning)]/20 bg-[var(--ops-warning-muted)] p-3 text-[13px] font-medium text-[var(--ops-warning)]">
            <Icon name="info" size={16} />
            Demo Mode is read-only. Turn Demo Mode off to edit real data.
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-1 border-b border-[var(--ops-border-subtle)]" role="tablist" aria-label="Database records">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-t-[var(--ops-radius-lg)] border-b-2 px-4 py-2.5 text-[14px] font-semibold transition-colors",
                tab === t.id
                  ? "border-[var(--ops-accent)] bg-white text-[var(--ops-accent-hover)]"
                  : "border-transparent text-[var(--ops-text-secondary)] hover:text-[var(--ops-text)]",
              )}
            >
              <Icon name={t.icon} size={16} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {tab === "properties" ? <AssetsPage embedded /> : null}
        {tab === "contacts" ? <DatabaseContactsTab /> : null}
        {tab === "documents" ? <DatabaseDocumentsTab /> : null}
        {tab === "media" ? <DatabaseMediaTab /> : null}
        {tab === "activity" ? <DatabaseActivityTab /> : null}
      </div>
    </div>
  );
}