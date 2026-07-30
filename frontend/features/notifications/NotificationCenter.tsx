"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notifications";
import type { AppNotification } from "@/types/domain";

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const severityDot: Record<string, string> = {
  success: "bg-[var(--ops-success)]",
  error: "bg-[var(--ops-danger)]",
  warning: "bg-[var(--ops-warning)]",
  info: "bg-[var(--ops-info)]",
};

/**
 * Topbar bell + dropdown for persistent in-app notifications.
 * Assignment alerts and system messages surface here.
 */
export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [list, count] = await Promise.all([
        listNotifications({ limit: 20 }),
        getUnreadCount(),
      ]);
      setItems(list.data);
      setUnread(count.data.count);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    void refresh();
  }, [open, refresh]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  async function handleMarkRead(id: string) {
    try {
      await markNotificationRead(id, true);
      await refresh();
    } catch {
      // keep panel open; silent fail for mock/offline
    }
  }

  async function handleMarkAll() {
    try {
      await markAllNotificationsRead();
      await refresh();
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={
          unread > 0
            ? `Notifications, ${unread} unread`
            : "Notifications"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className="relative"
      >
        <Icon name="bell" size={17} />
        {unread > 0 ? (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--ops-danger)] px-1 text-[9px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute top-full right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-bg-elevated)] shadow-[var(--ops-shadow)]"
        >
          <div className="flex items-center justify-between border-b border-[var(--ops-border)] px-3 py-2.5">
            <p className="text-sm font-semibold text-[var(--ops-text)]">
              Notifications
            </p>
            {unread > 0 ? (
              <button
                type="button"
                className="text-xs font-medium text-[var(--ops-accent-hover)] hover:underline"
                onClick={() => void handleMarkAll()}
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="space-y-2 p-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : null}

            {!loading && items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-[var(--ops-text-muted)]">
                No notifications yet.
              </p>
            ) : null}

            <ul className="divide-y divide-[var(--ops-border-subtle)]">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-[var(--ops-surface-hover)]",
                      !n.is_read && "bg-[var(--ops-accent-muted)]/30",
                    )}
                    onClick={() => {
                      if (!n.is_read) void handleMarkRead(n.id);
                    }}
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        severityDot[n.severity] ?? severityDot.info,
                        n.is_read && "opacity-40",
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "truncate text-sm text-[var(--ops-text)]",
                            !n.is_read && "font-medium",
                          )}
                        >
                          {n.title}
                        </p>
                        <span className="shrink-0 text-[10px] text-[var(--ops-text-muted)]">
                          {formatRelative(n.created_at)}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-[var(--ops-text-secondary)]">
                        {n.message}
                      </p>
                      {n.kind === "assignment" ? (
                        <span className="mt-1 inline-block text-[10px] font-medium tracking-wide text-[var(--ops-text-muted)] uppercase">
                          Assignment
                        </span>
                      ) : null}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
