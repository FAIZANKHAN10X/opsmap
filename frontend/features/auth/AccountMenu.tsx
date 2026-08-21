"use client";

import { useEffect, useId, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { UpgradePlanDialog } from "@/features/upgrade/UpgradePlanDialog";
import { cn } from "@/lib/cn";
import { useUser } from "@/stores/user-context";

/**
 * Signed-in account area (sidebar footer).
 *
 * Replaces the bare Sign Out button with a proper profile presentation:
 * avatar (provider image, initials fallback), display name and email. Clicking
 * opens a popover with Account, Upgrade Plan (UI-only surface) and Sign Out.
 */
export function AccountMenu({ collapsed = false }: { collapsed?: boolean }) {
  const user = useUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const displayName = user?.fullName?.trim() || "Account";
  const email = user?.email ?? "";

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleSignOut() {
    setSigningOut(true);
    const response = await fetch("/auth/signout", { method: "POST" });
    router.push(response.redirected ? response.url : "/login");
    router.refresh();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        title={displayName}
        aria-label={collapsed ? `Account menu — ${displayName}` : undefined}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-[var(--ops-radius)] px-2 py-1.5 text-left transition-colors",
          "hover:bg-[var(--ops-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ops-focus)]",
          open && "bg-[var(--ops-surface-hover)]",
          collapsed && "lg:justify-center lg:px-0",
        )}
      >
        <Avatar name={user?.fullName} email={user?.email} src={user?.avatarUrl} size="md" />
        <span className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
          <span className="block truncate text-sm font-semibold text-[var(--ops-text)]">
            {displayName}
          </span>
          {email ? (
            <span className="block truncate text-xs text-[var(--ops-text-muted)]">
              {email}
            </span>
          ) : null}
        </span>
        <Icon
          name="chevron-up"
          size={14}
          className={cn(
            "shrink-0 text-[var(--ops-text-muted)] transition-transform duration-200",
            open ? "rotate-180" : "",
            collapsed && "lg:hidden",
          )}
        />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account menu"
          className={cn(
            "absolute z-50 w-64 overflow-hidden rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-bg-elevated)] shadow-[var(--ops-shadow-lg)]",
            collapsed
              ? "bottom-full left-0 mb-2 lg:bottom-0 lg:left-full lg:ml-2 lg:mb-0"
              : "bottom-full left-0 mb-2",
          )}
        >
          <div className="border-b border-[var(--ops-border-subtle)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--ops-text)]">
              {displayName}
            </p>
            {email ? (
              <p className="mt-0.5 truncate text-xs text-[var(--ops-text-secondary)]">
                {email}
              </p>
            ) : null}
          </div>

          <div className="p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                router.push("/dashboard/settings");
              }}
              className="flex w-full items-center gap-2.5 rounded-[var(--ops-radius-sm)] px-3 py-2 text-sm font-medium text-[var(--ops-text)] transition-colors hover:bg-[var(--ops-surface-hover)]"
            >
              <Icon name="user" size={16} className="text-[var(--ops-text-muted)]" />
              Account / Profile
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setUpgradeOpen(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-[var(--ops-radius-sm)] px-3 py-2 text-sm font-medium text-[var(--ops-text)] transition-colors hover:bg-[var(--ops-accent-muted)] hover:text-[var(--ops-accent-strong)]"
            >
              <Icon name="sparkles" size={16} className="text-[var(--ops-accent)]" />
              Upgrade Plan
            </button>
          </div>

          <div className="border-t border-[var(--ops-border-subtle)] p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className="flex w-full items-center gap-2.5 rounded-[var(--ops-radius-sm)] px-3 py-2 text-sm font-medium text-[var(--ops-danger)] transition-colors hover:bg-[var(--ops-danger-muted)]"
            >
              <Icon name="logout" size={16} />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      ) : null}

      <UpgradePlanDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  );
}