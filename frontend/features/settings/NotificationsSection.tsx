"use client";

/**
 * Notifications settings (Phase 4).
 *
 * Notification preferences are not implemented yet. The app has a read-only
 * notification center (bell) fed by system notifications; per-user preference
 * management is a future phase — this section honestly says so instead of
 * fabricating controls.
 */

import { EmptyState } from "@/components/feedback/EmptyState";

export function NotificationsSection() {
  return (
    <div className="rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] shadow-sm bg-[var(--ops-surface)]">
      <header className="border-b border-[var(--ops-border-subtle)] p-4">
        <h2 className="text-sm font-semibold text-[var(--ops-text)]">
          Notifications
        </h2>
        <p className="mt-1 max-w-xl text-[13px] text-[var(--ops-text-secondary)]">
          Notification preferences for this workspace.
        </p>
      </header>
      <EmptyState
        title="NOT AVAILABLE YET"
        description="Notification preferences are not implemented yet. The notification bell shows system updates; per-user preferences arrive in a future phase."
      />
    </div>
  );
}