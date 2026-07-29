"use client";

/**
 * Pan / zoom viewport for the interactive workspace canvas.
 * UI-only state — local to the canvas, not server state.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

import {
  WORLD_HEIGHT,
  WORLD_WIDTH,
  boundsOf,
  type Point,
} from "@/lib/workspace-layout";

export const MIN_ZOOM = 0.35;
export const MAX_ZOOM = 2.75;
export const ZOOM_STEP = 0.15;

export type Viewport = {
  x: number;
  y: number;
  zoom: number;
};

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

type UseCanvasViewportResult = {
  viewport: Viewport;
  isPanning: boolean;
  didPan: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  setViewport: (next: Viewport) => void;
  zoomBy: (delta: number, origin?: Point) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  fitToPoints: (points: Point[]) => void;
  focusPoint: (point: Point) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  worldStyle: { width: number; height: number; transform: string };
};

export function useCanvasViewport(): UseCanvasViewportResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT);
  const viewportRef = useRef(viewport);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  const [isPanning, setIsPanning] = useState(false);
  const [didPan, setDidPan] = useState(false);
  const panSession = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  const zoomBy = useCallback((delta: number, origin?: Point) => {
    setViewport((prev) => {
      const zoom = clampZoom(prev.zoom + delta);
      if (zoom === prev.zoom) return prev;
      const el = containerRef.current;
      const ox = origin?.x ?? (el ? el.clientWidth / 2 : 0);
      const oy = origin?.y ?? (el ? el.clientHeight / 2 : 0);
      const worldX = (ox - prev.x) / prev.zoom;
      const worldY = (oy - prev.y) / prev.zoom;
      return {
        zoom,
        x: ox - worldX * zoom,
        y: oy - worldY * zoom,
      };
    });
  }, []);

  const zoomIn = useCallback(() => zoomBy(ZOOM_STEP), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(-ZOOM_STEP), [zoomBy]);

  const resetView = useCallback(() => {
    setViewport(DEFAULT_VIEWPORT);
  }, []);

  const fitToPoints = useCallback((points: Point[]) => {
    const el = containerRef.current;
    if (!el || points.length === 0) {
      setViewport(DEFAULT_VIEWPORT);
      return;
    }

    const bounds = boundsOf(points);
    if (!bounds) return;

    const pad = 120;
    const width = Math.max(bounds.maxX - bounds.minX, 80) + pad * 2;
    const height = Math.max(bounds.maxY - bounds.minY, 80) + pad * 2;
    const zoom = clampZoom(
      Math.min(el.clientWidth / width, el.clientHeight / height),
    );
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    setViewport({
      zoom,
      x: el.clientWidth / 2 - centerX * zoom,
      y: el.clientHeight / 2 - centerY * zoom,
    });
  }, []);

  const focusPoint = useCallback((point: Point) => {
    const el = containerRef.current;
    if (!el) return;
    setViewport((prev) => ({
      ...prev,
      x: el.clientWidth / 2 - point.x * prev.zoom,
      y: el.clientHeight / 2 - point.y * prev.zoom,
    }));
  }, []);

  // Non-passive wheel listener so preventDefault works for trackpad zoom.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const origin = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      const direction = event.deltaY > 0 ? -1 : 1;
      zoomBy(direction * ZOOM_STEP * 0.75, origin);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 && event.button !== 1) return;
      const target = event.target as HTMLElement;
      if (target.closest("[data-workspace-marker], [data-workspace-ui]")) {
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      const current = viewportRef.current;
      panSession.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: current.x,
        originY: current.y,
        moved: false,
      };
      setDidPan(false);
      setIsPanning(true);
    },
    [],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const session = panSession.current;
      if (!session || session.pointerId !== event.pointerId) return;

      const dx = event.clientX - session.startX;
      const dy = event.clientY - session.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        session.moved = true;
        setDidPan(true);
      }

      setViewport((prev) => ({
        ...prev,
        x: session.originX + dx,
        y: session.originY + dy,
      }));
    },
    [],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const session = panSession.current;
      if (!session || session.pointerId !== event.pointerId) return;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      panSession.current = null;
      setIsPanning(false);
    },
    [],
  );

  const worldStyle = useMemo(
    () => ({
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    }),
    [viewport],
  );

  return {
    viewport,
    isPanning,
    didPan,
    containerRef,
    setViewport,
    zoomBy,
    zoomIn,
    zoomOut,
    resetView,
    fitToPoints,
    focusPoint,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    worldStyle,
  };
}
