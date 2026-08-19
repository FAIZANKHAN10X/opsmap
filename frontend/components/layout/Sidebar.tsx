"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { SignOutButton } from "@/features/auth/SignOutButton";
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
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-[var(--ops-bg-elevated)] shadow-[var(--ops-shadow-lg)] lg:shadow-none lg:border-r border-[var(--ops-border-subtle)] transition-[width,transform] duration-300 ease-in-out",
          "lg:static lg:translate-x-0",
          sidebarCollapsed ? "lg:w-[var(--ops-sidebar-collapsed)]" : "lg:w-[var(--ops-sidebar-width)]",
          "w-[var(--ops-sidebar-width)]",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-[var(--ops-topbar-height)] items-center gap-3 px-4 pt-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--ops-radius-lg)] bg-[var(--ops-accent)] text-white shadow-sm">
            <Icon name="map" size={20} />
          </div>
          {!sidebarCollapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold tracking-tight text-[var(--ops-text)]">
                8AM HUB
              </p>
              <p className="truncate text-[11px] font-medium tracking-wide text-[var(--ops-text-muted)] uppercase">
                Operations
              </p>
            </div>
          ) : null}
          <Button
            variant="ghost"
            size="icon-sm"
            className="hidden lg:inline-flex text-[var(--ops-text-muted)] hover:text-[var(--ops-text)]"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Icon
              name={sidebarCollapsed ? "chevron-right" : "chevron-left"}
              size={18}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close menu"
          >
            <Icon name="x" size={18} />
          </Button>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-6" aria-label="Main">
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
                  "flex w-full items-center gap-3.5 rounded-[var(--ops-radius-lg)] px-3 py-2.5 transition-all duration-200 group relative",
                  active
                    ? "bg-[var(--ops-accent-muted)] text-[var(--ops-accent-hover)] font-semibold"
                    : "text-[var(--ops-text-secondary)] hover:bg-[var(--ops-surface-hover)] hover:text-[var(--ops-text)] font-medium",
                  sidebarCollapsed && "lg:justify-center lg:px-0",
                )}
                title={label}
                aria-current={active ? "page" : undefined}
              >
                <div className={cn(
                  "flex items-center justify-center transition-transform duration-200 group-hover:scale-110",
                  active ? "text-[var(--ops-accent)]" : "text-[var(--ops-text-muted)] group-hover:text-[var(--ops-text-secondary)]"
                )}>
                  <Icon name={item.icon} size={20} />
                </div>
                <span
                  className={cn(
                    "truncate tracking-wide text-[14px]",
                    sidebarCollapsed && "lg:hidden",
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col gap-3 p-4">
          <div
            className={cn(
              "flex flex-col gap-1 rounded-[var(--ops-radius-lg)] bg-[var(--ops-bg)] px-3 py-3 border border-[var(--ops-border-subtle)]",
              sidebarCollapsed && "lg:items-center",
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ops-text-muted)]">
              {footerLabel}
            </p>
            <p
              className={cn(
                "truncate text-[13px] font-semibold text-[var(--ops-text)]",
                sidebarCollapsed && "lg:hidden",
              )}
            >
              {footerValue}
            </p>
          </div>
          {!sidebarCollapsed ? <SignOutButton /> : null}
        </div>
      </aside>
    </>
  );
}
