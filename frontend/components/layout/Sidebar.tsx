"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AccountMenu } from "@/features/auth/AccountMenu";
import { Icon } from "@/components/ui/Icon";
import { useAsset } from "@/hooks/useAsset";
import { useProject } from "@/hooks/useProject";
import { cn } from "@/lib/cn";
import { DEMO_PROJECT } from "@/lib/demo/dataset";
import { MAIN_NAV, isNavItemActive } from "@/lib/nav";
import { useShell } from "@/stores/shell-context";

export function Sidebar() {
  const pathname = usePathname();
  const {
    sidebarCollapsed,
    toggleSidebar,
    setActiveNav,
    selectedProjectId,
    selectedAssetId,
    mobileNavOpen,
    setMobileNavOpen,
    demoMode,
  } = useShell();
  const project = useProject(selectedProjectId);
  const selectedProperty = useAsset(selectedAssetId);
  const developmentName = demoMode
    ? DEMO_PROJECT.name
    : project?.name?.trim() || 'ULLUWATU "26';
  const selectedAddress =
    selectedProperty &&
    typeof selectedProperty.metadata.address === "string" &&
    selectedProperty.metadata.address.trim()
      ? selectedProperty.metadata.address.trim()
      : null;
  const footerLabel = selectedAddress ? "Property address" : "Development";
  const footerValue = selectedAddress ?? developmentName;

  return (
    <>
      {/* Mobile overlay */}
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[2px] lg:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-[var(--ops-bg-elevated)] shadow-[var(--ops-shadow-lg)] transition-[width,transform] duration-200 ease-[var(--ops-ease)] lg:shadow-none lg:border-r border-[var(--ops-border)]",
          "lg:static lg:translate-x-0",
          sidebarCollapsed ? "lg:w-[var(--ops-sidebar-collapsed)]" : "lg:w-[var(--ops-sidebar-width)]",
          "w-[var(--ops-sidebar-width)]",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Brand — clean header, no floating collapse control */}
        <div className="flex h-[var(--ops-topbar-height)] shrink-0 items-center gap-3 px-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--ops-radius)] bg-[var(--ops-accent)] text-white shadow-sm">
            <Icon name="map" size={18} />
          </div>
          {!sidebarCollapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-bold tracking-tight text-[var(--ops-text)]">
                8AM HUB
              </p>
              <p className="truncate text-[10px] font-semibold tracking-widest text-[var(--ops-text-muted)] uppercase">
                Operations
              </p>
            </div>
          ) : null}
          <button
            type="button"
            className="ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--ops-radius-sm)] text-[var(--ops-text-muted)] transition-colors hover:bg-[var(--ops-surface-hover)] hover:text-[var(--ops-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ops-focus)] lg:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close menu"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="h-px shrink-0 bg-[var(--ops-border-subtle)]" aria-hidden />

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4" aria-label="Main">
          {MAIN_NAV.map((item) => {
            const active = isNavItemActive(pathname, item.href);
            const label =
              item.id === "development" ? developmentName : item.label;
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => {
                  setActiveNav(item.id);
                  setMobileNavOpen(false);
                }}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-[var(--ops-radius)] px-2.5 py-2 text-[14px] transition-colors duration-150",
                  active
                    ? "bg-[var(--ops-accent-muted)] text-[var(--ops-accent-strong)] font-semibold"
                    : "font-medium text-[var(--ops-text-secondary)] hover:bg-[var(--ops-surface-hover)] hover:text-[var(--ops-text)]",
                  sidebarCollapsed && "lg:justify-center lg:px-0",
                )}
                title={label}
                aria-current={active ? "page" : undefined}
              >
                {active ? (
                  <span
                    className="pointer-events-none absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-[var(--ops-accent)]"
                    aria-hidden
                  />
                ) : null}
                <span
                  className={cn(
                    "flex items-center justify-center transition-colors",
                    active ? "text-[var(--ops-accent)]" : "text-[var(--ops-text-muted)] group-hover:text-[var(--ops-text-secondary)]",
                  )}
                >
                  <Icon name={item.icon} size={18} />
                </span>
                <span
                  className={cn(
                    "truncate tracking-wide",
                    sidebarCollapsed && "lg:hidden",
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer: address block → collapse control → account */}
        <div className="flex flex-col gap-2 border-t border-[var(--ops-border-subtle)] p-2.5">
          {/* Property address / development */}
          <div
            className={cn(
              "rounded-[var(--ops-radius)] border border-[var(--ops-border-subtle)] bg-[var(--ops-surface-muted)] px-2.5 py-2",
              sidebarCollapsed && "lg:flex lg:flex-col lg:items-center lg:px-1.5 lg:py-2",
            )}
          >
            <p
              className={cn(
                "text-[10px] font-semibold uppercase tracking-widest text-[var(--ops-text-muted)]",
                sidebarCollapsed && "lg:hidden",
              )}
            >
              {footerLabel}
            </p>
            {sidebarCollapsed ? (
              <span
                className="hidden lg:inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[var(--ops-text-muted)] ring-1 ring-[var(--ops-border-subtle)]"
                aria-hidden
                title={footerValue}
              >
                <Icon name="pin" size={14} />
              </span>
            ) : null}
            <p
              className={cn(
                "mt-0.5 truncate text-[13px] font-semibold leading-snug text-[var(--ops-text)]",
                sidebarCollapsed && "lg:hidden",
              )}
              title={footerValue}
            >
              {footerValue}
            </p>
          </div>

          {/* Collapse / expand — intentional footer control, not a floating header icon */}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "hidden h-9 w-full items-center gap-2 rounded-[var(--ops-radius)] border border-transparent px-2.5 text-sm font-medium text-[var(--ops-text-secondary)] transition-colors hover:border-[var(--ops-border-subtle)] hover:bg-[var(--ops-surface-hover)] hover:text-[var(--ops-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ops-focus)] lg:flex",
              sidebarCollapsed && "lg:justify-center lg:px-0",
            )}
          >
            <Icon
              name={sidebarCollapsed ? "chevron-right" : "chevron-left"}
              size={16}
              className="shrink-0"
            />
            {!sidebarCollapsed ? (
              <span className="truncate">
                {sidebarCollapsed ? "Expand" : "Collapse"}
              </span>
            ) : null}
          </button>

          {/* Account */}
          <div className={cn(sidebarCollapsed && "lg:flex lg:justify-center")}>
            <div className={cn("w-full", sidebarCollapsed && "lg:w-auto")}>
              <AccountMenu collapsed={sidebarCollapsed} />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
