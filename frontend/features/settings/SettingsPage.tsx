"use client";

/**
 * SETTINGS — application configuration center (Phase 4).
 *
 * IA (locked):
 *   General / Users & Access / Integrations (Supabase, WhatsApp) /
 *   Notifications / System
 *
 * Section selection is local state (no URL param), matching the DATABASE tab
 * pattern so the shared shell URL sync does not strip a settings param.
 */

import { useState } from "react";

import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { useShell } from "@/stores/shell-context";
import { GeneralSettingsSection } from "@/features/settings/GeneralSettingsSection";
import { UsersRolesSection } from "@/features/settings/UsersRolesSection";
import { IntegrationsSection } from "@/features/settings/IntegrationsSection";
import { SupabaseIntegrationSection } from "@/features/settings/SupabaseIntegrationSection";
import { WhatsAppIntegrationSection } from "@/features/settings/WhatsAppIntegrationSection";
import { NotificationsSection } from "@/features/settings/NotificationsSection";
import { SystemSection } from "@/features/settings/SystemSection";

type SectionId =
  | "general"
  | "users"
  | "integrations"
  | "supabase"
  | "whatsapp"
  | "notifications"
  | "system";

type NavItem = {
  id: SectionId;
  label: string;
  icon: IconName;
  children?: Array<{ id: SectionId; label: string; icon: IconName }>;
};

const NAV: NavItem[] = [
  { id: "general", label: "General", icon: "settings" },
  { id: "users", label: "Users & Access", icon: "users" },
  {
    id: "integrations",
    label: "Integrations",
    icon: "external",
    children: [
      { id: "supabase", label: "Supabase", icon: "database" },
      { id: "whatsapp", label: "WhatsApp", icon: "info" },
    ],
  },
  { id: "notifications", label: "Notifications", icon: "bell" },
  { id: "system", label: "System", icon: "box" },
];

function isActive(section: SectionId, item: NavItem): boolean {
  if (section === item.id) return true;
  return Boolean(
    item.children && item.children.some((child) => child.id === section),
  );
}

export function SettingsPage() {
  const { demoMode } = useShell();
  const [section, setSection] = useState<SectionId>("general");

  const integrationsParentActive =
    section === "integrations" || section === "supabase" || section === "whatsapp";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto bg-[var(--ops-bg)] p-4 md:p-8">
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--ops-text)] sm:text-3xl">
          Settings
        </h1>
        <p className="mt-1.5 text-[15px] text-[var(--ops-text-secondary)]">
          Configure business defaults, access, and integrations.
        </p>
      </header>

      {demoMode ? (
        <p className="mb-4 rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-surface)] px-3 py-2 text-sm text-[var(--ops-text-secondary)]">
          Demo Mode is read-only — settings and integrations cannot be changed.
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
        <nav
          aria-label="Settings sections"
          className="w-full shrink-0 md:w-56"
        >
          <ul className="flex flex-col gap-1 md:sticky md:top-0">
            {NAV.map((item) => {
              const active = isActive(section, item);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSection(item.id)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-[var(--ops-radius)] px-3 py-2 text-left text-sm transition-colors",
                      active
                        ? "bg-[var(--ops-accent-muted)] text-[var(--ops-accent-hover)]"
                        : "text-[var(--ops-text-secondary)] hover:bg-[var(--ops-surface-hover)] hover:text-[var(--ops-text)]",
                    )}
                  >
                    <Icon name={item.icon} size={15} />
                    {item.label}
                  </button>
                  {item.children ? (
                    <ul className="mt-1 ml-3 flex flex-col gap-1 border-l border-[var(--ops-border-subtle)] pl-3">
                      {item.children.map((child) => {
                        const childActive = section === child.id;
                        const childVisible =
                          integrationsParentActive || childActive;
                        if (!childVisible) return null;
                        return (
                          <li key={child.id}>
                            <button
                              type="button"
                              onClick={() => setSection(child.id)}
                              aria-current={childActive ? "page" : undefined}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-[var(--ops-radius)] px-3 py-1.5 text-left text-sm transition-colors",
                                childActive
                                  ? "bg-[var(--ops-accent-muted)] text-[var(--ops-accent-hover)]"
                                  : "text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-hover)] hover:text-[var(--ops-text)]",
                              )}
                            >
                              <Icon name={child.icon} size={14} />
                              {child.label}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="min-w-0 flex-1">
          {section === "general" ? <GeneralSettingsSection /> : null}
          {section === "users" ? <UsersRolesSection /> : null}
          {section === "integrations" ? (
            <IntegrationsSection onOpen={(id) => setSection(id)} />
          ) : null}
          {section === "supabase" ? (
            <SupabaseIntegrationSection />
          ) : null}
          {section === "whatsapp" ? (
            <WhatsAppIntegrationSection />
          ) : null}
          {section === "notifications" ? <NotificationsSection /> : null}
          {section === "system" ? <SystemSection /> : null}
        </main>
      </div>
    </div>
  );
}