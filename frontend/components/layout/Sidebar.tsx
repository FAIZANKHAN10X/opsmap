"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { SignOutButton } from "@/features/auth/SignOutButton";
import { useProject } from "@/hooks/useProject";
import { cn } from "@/lib/cn";
import { MAIN_NAV, isNavItemActive } from "@/lib/nav";
import { useShell } from "@/stores/shell-context";

export function Sidebar() {
  const pathname = usePathname();
  const {
    sidebarCollapsed,
    toggleSidebar,
    setActiveNav,
    selectedProjectId,
    mobileNavOpen,
    setMobileNavOpen,
  } = useShell();
  const project = useProject(selectedProjectId);
  const propertyName = project?.name?.trim() || 'ULLUWATU "26';

  return (
    <>
      {/* Mobile overlay */}
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[var(--ops-border)] bg-[var(--ops-bg-elevated)] transition-[width,transform] duration-200",
          "lg:static lg:translate-x-0",
          sidebarCollapsed ? "lg:w-[var(--ops-sidebar-collapsed)]" : "lg:w-[var(--ops-sidebar-width)]",
          "w-[var(--ops-sidebar-width)]",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-[var(--ops-topbar-height)] items-center gap-2 border-b border-[var(--ops-border)] px-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--ops-radius)] bg-[var(--ops-accent-muted)] text-[var(--ops-accent)]">
            <Icon name="map" size={16} />
          </div>
          {!sidebarCollapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold tracking-tight text-[var(--ops-text)]">
                8AM HUB
              </p>
              <p className="truncate text-[10px] uppercase tracking-wider text-[var(--ops-text-muted)]">
                Internal Operations
              </p>
            </div>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-8 w-8 lg:inline-flex"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Icon
              name={sidebarCollapsed ? "chevron-right" : "chevron-left"}
              size={16}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close menu"
          >
            <Icon name="x" size={16} />
          </Button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2" aria-label="Main">
          {MAIN_NAV.map((item) => {
            // Only the item whose unique href matches the current path is active.
            const active = isNavItemActive(pathname, item.href);
            const label =
              item.id === "development" ? propertyName : item.label;
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => {
                  setActiveNav(item.id);
                  setMobileNavOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[var(--ops-radius)] px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-[var(--ops-accent-muted)] text-[var(--ops-accent-hover)]"
                    : "text-[var(--ops-text-secondary)] hover:bg-[var(--ops-surface-hover)] hover:text-[var(--ops-text)]",
                  sidebarCollapsed && "lg:justify-center lg:px-0",
                )}
                title={label}
                aria-current={active ? "page" : undefined}
              >
                <Icon name={item.icon} size={18} />
                <span
                  className={cn(
                    "truncate font-medium uppercase tracking-wide",
                    sidebarCollapsed && "lg:hidden",
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col gap-2 border-t border-[var(--ops-border)] p-3">
          <div
            className={cn(
              "flex flex-col gap-1 rounded-[var(--ops-radius)] px-2 py-2",
              sidebarCollapsed && "lg:items-center",
            )}
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--ops-text-muted)]">
              Property Address
            </p>
            <p
              className={cn(
                "truncate text-xs font-medium text-[var(--ops-text)]",
                sidebarCollapsed && "lg:hidden",
              )}
            >
              {propertyName}
            </p>
          </div>
          {!sidebarCollapsed ? <SignOutButton /> : null}
        </div>
      </aside>
    </>
  );
}
