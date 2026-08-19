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

  useEffect(() => {
    let cancelled = false;

    listProjects({ status: "active" })
      .then((res) => {
        if (cancelled) return;
        setLoadState({ status: "ready", projects: res.data });
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
    return <Skeleton className="h-10 w-48 rounded-[var(--ops-radius-lg)]" />;
  }

  if (loadState.status === "error") {
    return (
      <span className="text-xs text-[var(--ops-danger)]">Projects unavailable</span>
    );
  }

  if (demoMode) {
    return (
      <button
        type="button"
        disabled
        title="Turn Demo OFF to switch project"
        aria-label="Demo mode — project switching disabled"
        className="flex h-10 max-w-[240px] cursor-default items-center gap-2.5 rounded-[var(--ops-radius-lg)] border border-transparent bg-[var(--ops-surface-hover)] px-3.5 text-left text-[14px] opacity-70"
      >
        <Icon name="folder" size={16} className="text-[var(--ops-text-muted)]" />
        <span className="min-w-0 flex-1 truncate font-medium text-[var(--ops-text)]">
          {DEMO_PROJECT.name}
        </span>
        <span className="rounded-full bg-[var(--ops-accent-muted)] px-2 py-0.5 font-mono text-[10px] tracking-wide text-[var(--ops-accent)] uppercase">
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
          "flex h-10 max-w-[240px] items-center gap-2.5 rounded-[var(--ops-radius-lg)] border border-transparent bg-[var(--ops-surface-hover)] px-3.5 text-left text-[14px] transition-colors",
          "hover:bg-[var(--ops-surface-active)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ops-focus)]",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="folder" size={16} className="text-[var(--ops-accent)]" />
        <span className="min-w-0 flex-1 truncate font-semibold text-[var(--ops-text)]">
          {selected?.name ?? "Select development"}
        </span>
        <Icon name="chevron-down" size={16} className="text-[var(--ops-text-muted)]" />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] bg-[var(--ops-surface)] shadow-[var(--ops-shadow-lg)]">
          <div className="px-4 pt-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--ops-text-muted)]">
            Switch Development
          </div>
          <ul
            id={listId}
            role="listbox"
            className="max-h-64 overflow-auto px-2 pb-2"
          >
            {projects.map((project) => {
              const isActive = project.id === selectedProjectId;
              return (
                <li key={project.id} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full flex-col rounded-[var(--ops-radius)] px-3 py-2 text-left text-[14px] transition-colors",
                      isActive
                        ? "bg-[var(--ops-accent-muted)]"
                        : "hover:bg-[var(--ops-surface-hover)]"
                    )}
                    onClick={() => {
                      setSelectedProjectId(project.id);
                      setOpen(false);
                    }}
                  >
                    <span className={cn("font-medium", isActive ? "text-[var(--ops-accent-hover)]" : "text-[var(--ops-text)]")}>
                      {project.name}
                    </span>
                    <span className="text-xs text-[var(--ops-text-muted)] mt-0.5">
                      {project.slug}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="p-2 border-t border-[var(--ops-border-subtle)] bg-[var(--ops-bg)]">
            <Link
              href="/dashboard/projects"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-[var(--ops-radius)] bg-white px-3 py-2 text-[13px] font-medium text-[var(--ops-text-secondary)] border border-[var(--ops-border-subtle)] hover:bg-[var(--ops-surface-hover)] hover:text-[var(--ops-text)] transition-colors"
            >
              <Icon name="folder" size={14} />
              Manage developments
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
