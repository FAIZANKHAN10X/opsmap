"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { AssetMarker } from "@/features/workspace/AssetMarker";
import { HoverTooltip } from "@/features/workspace/HoverTooltip";
import { WorkspaceToolbar } from "@/features/workspace/WorkspaceToolbar";
import { useCanvasViewport } from "@/hooks/useCanvasViewport";
import { cn } from "@/lib/cn";
import { computeHighlightIds } from "@/lib/workspace-highlights";
import {
  WORLD_HEIGHT,
  WORLD_WIDTH,
  layoutAssets,
  screenToWorld,
} from "@/lib/workspace-layout";
import { useShell } from "@/stores/shell-context";
import type { Asset, AssetStatus, AssetType } from "@/types/domain";
import type { Point } from "@/lib/workspace-layout";

type InteractiveCanvasProps = {
  assets: Asset[];
  statuses: AssetStatus[];
  types: AssetType[];
  /** Asset IDs matching current search/filter highlight set. Empty = no special highlight. */
  highlightIds?: Set<string>;
  /** When true, non-matching assets are dimmed if any highlight set is non-empty. */
  dimNonHighlighted?: boolean;
  /** Pending click-to-place position rendered as a marker. */
  placement?: Point | null;
  /** When provided, clicking the canvas background places at the world point instead of clearing selection. */
  onPlace?: (point: Point) => void;
};

export function InteractiveCanvas({
  assets,
  statuses,
  types,
  highlightIds,
  dimNonHighlighted = false,
  placement,
  onPlace,
}: InteractiveCanvasProps) {
  const { selectedAssetId, setSelectedAssetId, setInfoPanelOpen, filters } =
    useShell();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const fittedKeyRef = useRef<string | null>(null);

  const {
    viewport,
    isPanning,
    didPan,
    containerRef,
    zoomIn,
    zoomOut,
    resetView,
    fitToPoints,
    focusPoint,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    worldStyle,
  } = useCanvasViewport();

  const positions = useMemo(() => layoutAssets(assets), [assets]);
  const statusById = useMemo(
    () => new Map(statuses.map((s) => [s.id, s])),
    [statuses],
  );
  const typeById = useMemo(() => new Map(types.map((t) => [t.id, t])), [types]);

  const pointList = useMemo(
    () =>
      assets
        .map((a) => positions.get(a.id))
        .filter((p): p is { x: number; y: number } => Boolean(p)),
    [assets, positions],
  );

  const assetsKey = useMemo(() => assets.map((a) => a.id).join(","), [assets]);

  // Fit once per distinct asset set (e.g. project switch).
  useEffect(() => {
    if (pointList.length === 0) return;
    if (fittedKeyRef.current === assetsKey) return;
    fittedKeyRef.current = assetsKey;
    const id = window.requestAnimationFrame(() => fitToPoints(pointList));
    return () => window.cancelAnimationFrame(id);
  }, [assetsKey, pointList, fitToPoints]);

  // Escape clears selection.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setSelectedAssetId(null);
      setHoveredId(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setSelectedAssetId]);

  const activeHighlights = useMemo(
    () => computeHighlightIds({ assets, statuses, types, filters, highlightIds }),
    [highlightIds, filters, assets, statuses, types],
  );

  const hasActiveHighlight = activeHighlights.size > 0;

  function handleSelect(assetId: string) {
    setSelectedAssetId(assetId);
    setInfoPanelOpen(true);
    const point = positions.get(assetId);
    if (point) focusPoint(point);
  }

  function handleBackgroundClick(event: React.MouseEvent<HTMLDivElement>) {
    if (didPan || isPanning) return;
    if (onPlace) {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      onPlace(screenToWorld(event.clientX, event.clientY, rect, viewport));
      return;
    }
    setSelectedAssetId(null);
  }

  const hoveredAsset = hoveredId
    ? assets.find((a) => a.id === hoveredId)
    : null;
  const hoveredPos = hoveredId ? positions.get(hoveredId) : null;

  return (
    <div className="relative h-full min-h-[320px] w-full">
      <WorkspaceToolbar
        zoom={viewport.zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFit={() => fitToPoints(pointList)}
        onReset={resetView}
        onFocusSelected={() => {
          if (!selectedAssetId) return;
          const point = positions.get(selectedAssetId);
          if (point) focusPoint(point);
        }}
        hasSelection={Boolean(selectedAssetId)}
      />

      <div
        className="absolute bottom-3 left-3 z-20 rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-bg)]/80 px-2.5 py-1.5 text-[10px] font-medium tracking-wider text-[var(--ops-text-muted)] uppercase backdrop-blur-sm"
        data-workspace-ui
      >
        Scroll zoom · Drag pan · Click select · Esc clear
      </div>

      <div
        ref={containerRef}
        className={cn(
          "absolute inset-0 overflow-hidden bg-[var(--ops-surface)] touch-none",
          isPanning ? "cursor-grabbing" : "cursor-grab",
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={handleBackgroundClick}
        role="application"
        aria-label="Interactive project workspace"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage: `
              linear-gradient(to right, var(--ops-border-subtle) 1px, transparent 1px),
              linear-gradient(to bottom, var(--ops-border-subtle) 1px, transparent 1px)
            `,
            backgroundSize: `${32 * viewport.zoom}px ${32 * viewport.zoom}px`,
            backgroundPosition: `${viewport.x}px ${viewport.y}px`,
          }}
        />

        <div
          className="absolute top-0 left-0 origin-top-left will-change-transform"
          style={worldStyle}
        >
          <div
            className="absolute border border-[var(--ops-border)] bg-[var(--ops-bg-elevated)]/40"
            style={{ width: WORLD_WIDTH, height: WORLD_HEIGHT }}
          >
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `
                  linear-gradient(to right, var(--ops-border) 1px, transparent 1px),
                  linear-gradient(to bottom, var(--ops-border) 1px, transparent 1px)
                `,
                backgroundSize: "80px 80px",
              }}
            />
            <div className="absolute top-4 left-4 font-mono text-[11px] tracking-widest text-[var(--ops-text-muted)] uppercase">
              Site plan
            </div>
          </div>

          {assets.map((asset) => {
            const position = positions.get(asset.id);
            if (!position) return null;
            const status = asset.asset_status_id
              ? statusById.get(asset.asset_status_id)
              : undefined;
            const type = asset.asset_type_id
              ? typeById.get(asset.asset_type_id)
              : undefined;
            const isHighlighted = activeHighlights.has(asset.id);
            const dimmed =
              dimNonHighlighted &&
              hasActiveHighlight &&
              !isHighlighted &&
              asset.id !== selectedAssetId;

            return (
              <AssetMarker
                key={asset.id}
                asset={asset}
                position={position}
                status={status}
                type={type}
                selected={asset.id === selectedAssetId}
                focused={asset.id === selectedAssetId}
                highlighted={isHighlighted}
                dimmed={dimmed}
                onSelect={handleSelect}
                onHoverChange={setHoveredId}
              />
            );
          })}

          {placement ? (
            <div
              data-testid="placement-marker"
              data-placement-x={placement.x}
              data-placement-y={placement.y}
              className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2"
              style={{ left: placement.x, top: placement.y }}
              aria-label={`Place at ${placement.x}, ${placement.y}`}
            >
              <div className="relative flex h-6 w-6 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-[var(--ops-accent)]/30" />
                <span className="relative h-3.5 w-3.5 rounded-full border-2 border-[var(--ops-accent)] bg-[var(--ops-accent)]/20 shadow-[0_0_0_3px_var(--ops-bg-elevated)]" />
              </div>
              <span className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-bg-elevated)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--ops-text-muted)] shadow-[var(--ops-shadow-sm)]">
                {Math.round(placement.x)}, {Math.round(placement.y)}
              </span>
            </div>
          ) : null}

          {hoveredAsset && hoveredPos ? (
            <HoverTooltip
              asset={hoveredAsset}
              position={hoveredPos}
              status={
                hoveredAsset.asset_status_id
                  ? statusById.get(hoveredAsset.asset_status_id)
                  : undefined
              }
              type={
                hoveredAsset.asset_type_id
                  ? typeById.get(hoveredAsset.asset_type_id)
                  : undefined
              }
              zoom={viewport.zoom}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
