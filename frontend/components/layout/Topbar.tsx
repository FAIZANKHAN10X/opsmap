"use client";

import { ProjectSelector } from "@/features/projects/ProjectSelector";
import { SearchBar } from "@/features/search/SearchBar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useShell } from "@/stores/shell-context";

export function Topbar() {
  const { setMobileNavOpen, toggleInfoPanel, infoPanelOpen } = useShell();

  return (
    <header className="flex h-[var(--ops-topbar-height)] shrink-0 items-center gap-3 border-b border-[var(--ops-border)] bg-[var(--ops-bg-elevated)] px-3 lg:px-4">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open navigation"
      >
        <Icon name="menu" size={18} />
      </Button>

      <div className="flex min-w-0 items-center gap-2">
        <ProjectSelector />
        <span className="hidden text-[var(--ops-text-muted)] sm:inline">/</span>
        <span className="hidden text-sm text-[var(--ops-text-secondary)] sm:inline">
          Workspace
        </span>
      </div>

      <SearchBar />

      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Icon name="bell" size={17} />
        </Button>
        <Button
          variant={infoPanelOpen ? "primary" : "ghost"}
          size="icon"
          aria-label={infoPanelOpen ? "Close details panel" : "Open details panel"}
          aria-pressed={infoPanelOpen}
          onClick={toggleInfoPanel}
        >
          <Icon name="panel" size={17} />
        </Button>
      </div>
    </header>
  );
}
