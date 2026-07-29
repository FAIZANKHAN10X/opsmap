"use client";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { MAX_ZOOM, MIN_ZOOM } from "@/hooks/useCanvasViewport";

type WorkspaceToolbarProps = {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onReset: () => void;
  onFocusSelected: () => void;
  hasSelection: boolean;
};

export function WorkspaceToolbar({
  zoom,
  onZoomIn,
  onZoomOut,
  onFit,
  onReset,
  onFocusSelected,
  hasSelection,
}: WorkspaceToolbarProps) {
  const percent = Math.round(zoom * 100);

  return (
    <div
      data-workspace-ui
      className="absolute top-3 left-3 z-20 flex items-center gap-1 rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-bg)]/90 p-1 shadow-[var(--ops-shadow-sm)] backdrop-blur-sm"
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onZoomOut}
        disabled={zoom <= MIN_ZOOM + 0.001}
        aria-label="Zoom out"
      >
        <Icon name="minus" size={15} />
      </Button>
      <span className="min-w-[3.25rem] text-center font-mono text-[11px] text-[var(--ops-text-secondary)]">
        {percent}%
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onZoomIn}
        disabled={zoom >= MAX_ZOOM - 0.001}
        aria-label="Zoom in"
      >
        <Icon name="plus" size={15} />
      </Button>
      <div className="mx-0.5 h-5 w-px bg-[var(--ops-border)]" aria-hidden />
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onFit}
        aria-label="Fit all assets"
        title="Fit all"
      >
        <Icon name="maximize" size={15} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onReset}
        aria-label="Reset view"
        title="Reset view"
      >
        <Icon name="refresh" size={15} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onFocusSelected}
        disabled={!hasSelection}
        aria-label="Focus selected asset"
        title="Focus selected"
      >
        <Icon name="crosshair" size={15} />
      </Button>
    </div>
  );
}
