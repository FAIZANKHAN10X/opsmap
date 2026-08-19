"use client";

import { ProjectSelector } from "@/features/projects/ProjectSelector";
import { SearchBar } from "@/features/search/SearchBar";
import { NotificationCenter } from "@/features/notifications/NotificationCenter";
import { DemoToggle } from "@/features/demo/DemoToggle";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useShell } from "@/stores/shell-context";

export function Topbar() {
  const { setMobileNavOpen, toggleInfoPanel, infoPanelOpen } = useShell();

  return (
    <header className="flex h-[var(--ops-topbar-height)] shrink-0 items-center gap-4 border-b border-[var(--ops-border-subtle)] bg-[var(--ops-bg-elevated)] px-4 lg:px-6 z-10 relative">
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden text-[var(--ops-text-secondary)]"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open navigation"
      >
        <Icon name="menu" size={20} />
      </Button>

      <div className="flex min-w-0 items-center gap-3">
        <ProjectSelector />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <SearchBar />
        <div className="h-6 w-px bg-[var(--ops-border-subtle)] mx-1 hidden sm:block"></div>
        <DemoToggle />
        <NotificationCenter />
        <Button
          variant={infoPanelOpen ? "tonal" : "ghost"}
          size="icon-sm"
          className="rounded-full w-9 h-9"
          aria-label={infoPanelOpen ? "Close details panel" : "Open details panel"}
          aria-pressed={infoPanelOpen}
          onClick={toggleInfoPanel}
        >
          <Icon name="panel" size={18} />
        </Button>
      </div>
    </header>
  );
}
