"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { DEMO_PROJECT } from "@/lib/demo/dataset";
import { listProjects } from "@/services/projects";
import { useShell } from "@/stores/shell-context";
import type { Project } from "@/types/domain";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; projects: Project[] };

export function ProjectSelector() {
  const {
    selectedProjectId,
    setSelectedProjectId,
    demoMode,
    refreshKey,
  } = useShell();
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selectedProjectIdRef = useRef(selectedProjectId);

  useEffect(() => {
    selectedProjectIdRef.current = selectedProjectId;
  }, [selectedProjectId]);

  // Active developments only (archived/deleted projects are filtered out).
  // Subscribes to refreshKey so create/rename/archive/delete elsewhere bumps a
  // refetch without a browser reload.
  useEffect(() => {
    let cancelled = false;

    listProjects({ status: "active" })
      .then((res) => {
        if (cancelled) return;
        setLoadState({ status: "ready", projects: res.data });
        // If the selected project was archived/deleted it no longer appears;
        // clear it so the seed effect recovers the first active development.
        const current = selectedProjectIdRef.current;
        if (current && !res.data.some((p) => p.id === current)) {
          setSelectedProjectId(null);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setLoadState({
            status: "error",
            message: err.message || "Failed to load projects.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey, setSelectedProjectId]);

  // Seed default project once list is ready and nothing is selected.
  useEffect(() => {
    if (loadState.status !== "ready") return;
    if (selectedProjectId) return;
    if (loadState.projects.length === 0) return;
    setSelectedProjectId(loadState.projects[0].id);
  }, [loadState, selectedProjectId, setSelectedProjectId]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  if (loadState.status === "loading") {
    return <Skeleton className="h-9 w-44" />;
  }

  if (loadState.status === "error") {
    return (
      <span className="text-xs text-[var(--ops-danger)]">Projects unavailable</span>
    );
  }

  // Demo mode shows the demo development and disables project switching.
  if (demoMode) {
    return (
      <button
        type="button"
        disabled
        title="Turn Demo OFF to switch project"
        aria-label="Demo mode — project switching disabled"
        className="flex h-9 max-w-[220px] cursor-default items-center gap-2 rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-surface)] px-2.5 text-left text-sm opacity-70"
      >
        <Icon name="folder" size={15} className="text-[var(--ops-text-muted)]" />
        <span className="min-w-0 flex-1 truncate font-medium text-[var(--ops-text)]">
          {DEMO_PROJECT.name}
        </span>
        <span className="font-mono text-[10px] tracking-wide text-[var(--ops-text-muted)] uppercase">
          demo
        </span>
      </button>
    );
  }

  const projects = loadState.projects;
  const selected = projects.find((p) => p.id === selectedProjectId) ?? null;

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        className={cn(
          "flex h-9 max-w-[220px] items-center gap-2 rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-surface)] px-2.5 text-left text-sm",
          "hover:border-[var(--ops-border-strong)] hover:bg-[var(--ops-surface-hover)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ops-focus)]",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="folder" size={15} className="text-[var(--ops-text-muted)]" />
        <span className="min-w-0 flex-1 truncate font-medium text-[var(--ops-text)]">
          {selected?.name ?? "Select development"}
        </span>
        <Icon name="chevron-down" size={14} className="text-[var(--ops-text-muted)]" />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-surface)] shadow-[var(--ops-shadow)]">
          <ul
            id={listId}
            role="listbox"
            className="max-h-56 overflow-auto py-1"
          >
            {projects.map((project) => {
              const isActive = project.id === selectedProjectId;
              return (
                <li key={project.id} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-[var(--ops-surface-hover)]",
                      isActive && "bg-[var(--ops-accent-muted)]",
                    )}
                    onClick={() => {
                      setSelectedProjectId(project.id);
                      setOpen(false);
                    }}
                  >
                    <span className="font-medium text-[var(--ops-text)]">
                      {project.name}
                    </span>
                    <span className="text-xs text-[var(--ops-text-muted)]">
                      {project.slug}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <Link
            href="/dashboard/projects"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 border-t border-[var(--ops-border)] px-3 py-2 text-xs font-medium text-[var(--ops-text-secondary)] hover:bg-[var(--ops-surface-hover)] hover:text-[var(--ops-text)]"
          >
            <Icon name="folder" size={13} />
            Manage developments
          </Link>
        </div>
      ) : null}
    </div>
  );
}
