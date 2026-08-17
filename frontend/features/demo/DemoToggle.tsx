"use client";

import { cn } from "@/lib/cn";
import { useShell } from "@/stores/shell-context";

/**
 * Demo / Mock Data control — topbar placement, immediately to the left of
 * the notification bell (Phase 12 layout, Phase 13 behavior).
 *
 * This is an ADDED product requirement, not a Figma element; its treatment
 * follows the 8AM HUB design language (compact rectangular control, black
 * border, black Figtree type, blue accent when active).
 *
 * Demo mode is session-local, in-memory, and NOT persisted: OFF → ON →
 * OFF → ON is a deterministic boolean transition, a page refresh returns to
 * OFF (normal data), and demo data never touches the database.
 */
export function DemoToggle() {
  const { demoMode, setDemoMode } = useShell();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={demoMode}
      aria-label={demoMode ? "Turn demo data off" : "Turn demo data on"}
      title={
        demoMode
          ? "Demo / Mock Data — on. Switch off to return to real data."
          : "Demo / Mock Data — off. Switch on to load the demo dataset."
      }
      onClick={() => setDemoMode(!demoMode)}
      className={cn(
        "flex h-9 items-center gap-2 rounded-[var(--ops-radius)] border px-2.5 text-xs font-medium transition-colors",
        demoMode
          ? "border-[var(--ops-accent)] bg-[var(--ops-accent-muted)] text-[var(--ops-accent-hover)]"
          : "border-[var(--ops-border)] bg-[var(--ops-surface)] text-[var(--ops-text)] hover:bg-[var(--ops-surface-hover)]",
      )}
    >
      Demo
      <span
        className={cn(
          "inline-flex h-5 items-center rounded-[var(--ops-radius-sm)] border px-1.5 font-mono text-[10px] tracking-wide uppercase",
          demoMode
            ? "border-[var(--ops-accent)] bg-[var(--ops-accent)] text-white"
            : "border-[var(--ops-border)] bg-[var(--ops-surface)] text-[var(--ops-text-muted)]",
        )}
      >
        {demoMode ? "ON" : "OFF"}
      </span>
    </button>
  );
}