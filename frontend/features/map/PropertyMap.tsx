"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  AdvancedMarker,
  APIProvider,
  Map as GoogleMap,
  useMap,
} from "@vis.gl/react-google-maps";

import { Icon } from "@/components/ui/Icon";
import { statusColor } from "@/lib/status-colors";
import type { Asset, AssetStatus } from "@/types/domain";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  GOOGLE_MAPS_API_KEY,
  GOOGLE_MAPS_MAP_ID,
  isGoogleMapsConfigured,
  isPlaced,
  type GeoPoint,
} from "./geo";

export type PropertyMapProps = {
  assets: Asset[];
  statuses: AssetStatus[];
  selectedAssetId?: string | null;
  /** Marker click. Called with null for background clicks when not placing. */
  onSelect?: (assetId: string | null) => void;
  /** Placement mode: background clicks emit coordinates instead of clearing selection. */
  placementMode?: boolean;
  /** Pending placement marker (form not yet saved). */
  placement?: GeoPoint | null;
  onPlace?: (coords: GeoPoint) => void;
  /**
   * External focus request (list → map). Bump `nonce` to re-focus the same
   * asset; the map flies to it and centers.
   */
  focusRequest?: { assetId: string; nonce: number } | null;
  /** Bump to re-fit the viewport to all placed properties. */
  fitNonce?: number;
  className?: string;
};

function PlacedMarkers({
  assets,
  statuses,
  selectedAssetId,
  onSelect,
}: {
  assets: Asset[];
  statuses: AssetStatus[];
  selectedAssetId: string | null | undefined;
  onSelect?: (assetId: string) => void;
}) {
  const statusById = useMemo(
    () => new Map(statuses.map((s) => [s.id, s])),
    [statuses],
  );

  const placed = useMemo(() => assets.filter(isPlaced), [assets]);

  return (
    <>
      {placed.map((asset) => {
        const status = statusById.get(asset.asset_status_id ?? "");
        const color = statusColor(status?.slug ?? "", status?.color ?? null);
        const isSelected = asset.id === selectedAssetId;
        return (
          <AdvancedMarker
            key={asset.id}
            position={{ lat: asset.latitude as number, lng: asset.longitude as number }}
            onClick={() => onSelect?.(asset.id)}
            title={asset.name}
          >
            <PropertyMarkerDot color={color} selected={isSelected} />
          </AdvancedMarker>
        );
      })}
    </>
  );
}

function PropertyMarkerDot({
  color,
  selected,
}: {
  color: string;
  selected: boolean;
}) {
  return (
    <div
      data-testid="property-marker"
      data-selected={selected ? "true" : "false"}
      style={
        {
          "--marker-color": color,
        } as React.CSSProperties
      }
      className={
        selected
          ? "flex h-10 w-10 items-center justify-center rounded-full border-[3px] bg-white shadow-lg ring-4 ring-[var(--marker-color)]/30"
          : "flex h-9 w-9 items-center justify-center rounded-full border-[3px] bg-white shadow-md"
      }
    >
      <span
        className="flex h-full w-full items-center justify-center rounded-full text-white"
        style={{ backgroundColor: color }}
      >
        <Icon name="home" size={16} className="text-white" />
      </span>
    </div>
  );
}

function PendingPlacementMarker({ placement }: { placement: GeoPoint }) {
  return (
    <AdvancedMarker position={{ lat: placement.latitude, lng: placement.longitude }}>
      <div className="ops-placement-marker" data-testid="placement-marker">
        <span className="ops-placement-ping" />
        <span className="ops-placement-dot" />
      </div>
    </AdvancedMarker>
  );
}

function MapController({
  assets,
  focusRequest,
  fitNonce,
  onPlace,
  onSelect,
  placementMode,
}: {
  assets: Asset[];
  focusRequest?: { assetId: string; nonce: number } | null;
  fitNonce?: number;
  onPlace?: (coords: GeoPoint) => void;
  onSelect?: (assetId: string | null) => void;
  placementMode?: boolean;
}) {
  const map = useMap();

  const fitToPlaced = useCallback(
    (animate = true) => {
      if (!map) return;
      const placed = assets.filter(isPlaced);
      if (placed.length === 0) return;
      const bounds = new window.google.maps.LatLngBounds();
      for (const a of placed) {
        bounds.extend({ lat: a.latitude as number, lng: a.longitude as number });
      }
      if (placed.length === 1) {
        map.panTo(bounds.getCenter());
        map.setZoom(Math.max(map.getZoom() ?? 14, 14));
        return;
      }
      map.fitBounds(bounds, 72);
      // fitBounds is async in google maps; ensure zoom cap after
      if (animate) {
        // no-op: fitBounds already animates
      }
    },
    [map, assets],
  );

  // Auto-fit when placed set changes
  const placedIdsKey = useMemo(
    () =>
      assets
        .filter(isPlaced)
        .map((a) => a.id)
        .sort()
        .join(","),
    [assets],
  );

  useEffect(() => {
    if (placedIdsKey) fitToPlaced(false);
  }, [placedIdsKey, fitToPlaced]);

  useEffect(() => {
    if (fitNonce && fitNonce > 0) fitToPlaced(true);
  }, [fitNonce, fitToPlaced]);

  // List → map focus
  useEffect(() => {
    if (!focusRequest || !map) return;
    const target = assets.find((a) => a.id === focusRequest.assetId);
    if (!target || !isPlaced(target)) return;
    map.panTo({ lat: target.latitude as number, lng: target.longitude as number });
    const currentZoom = map.getZoom() ?? DEFAULT_MAP_ZOOM;
    if (currentZoom < 14) map.setZoom(14);
  }, [focusRequest, assets, map]);

  // Reposition Google zoom control to avoid overlap with OpsMap legend (bottom-right) on ~375px.
  useEffect(() => {
    if (!map || !window.google?.maps?.ControlPosition) return;
    try {
      map.setOptions({
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.LEFT_BOTTOM,
        },
      });
    } catch {
      // ignore if Google Maps not fully loaded
    }
  }, [map]);

  // Map click handling — place vs clear selection
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("click", (e: google.maps.MapMouseEvent) => {
      // Ignore clicks on markers (they have their own onClick)
      // Google Maps click on marker still bubbles; check place_ is not on marker
      // We use a small timeout to let marker click fire first — but simpler:
      // if clicking on a marker, e.placeId is undefined but marker click already handled
      // For Google Maps, marker clicks stop propagation, so background click won't fire when marker clicked
      const latLng = e.latLng;
      if (!latLng) return;
      if (placementMode) {
        onPlace?.({ latitude: latLng.lat(), longitude: latLng.lng() });
      } else {
        onSelect?.(null);
      }
    });
    return () => window.google.maps.event.removeListener(listener);
  }, [map, placementMode, onPlace, onSelect]);

  return null;
}

/**
 * Real geographic property map (Google Maps). Markers are driven by the same
 * filtered asset list the list view uses — one source of truth.
 *
 * Rendered client-only via next/dynamic (see PropertyMapLazy.tsx).
 */
export default function PropertyMapInner({
  assets,
  statuses,
  selectedAssetId = null,
  onSelect,
  placementMode = false,
  placement = null,
  onPlace,
  focusRequest = null,
  fitNonce = 0,
  className,
}: PropertyMapProps) {
  const placedCount = useMemo(() => assets.filter(isPlaced).length, [assets]);

  const defaultCenter = useMemo(() => {
    const placed = assets.filter(isPlaced);
    if (placed.length === 0) return DEFAULT_MAP_CENTER;
    // Center on first placed property for initial view before fit
    return { lat: placed[0].latitude as number, lng: placed[0].longitude as number };
  }, [assets]);

  // Warn in dev if Map ID missing — AdvancedMarkerElement requires it.
  if (!GOOGLE_MAPS_MAP_ID && typeof window !== "undefined") {
    console.warn(
      "[PropertyMap] NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID is not set. AdvancedMarkerElement requires a Map ID — create one in Google Cloud Console (Maps → Map Management). Markers will fall back to default rendering without it.",
    );
  }

  if (!isGoogleMapsConfigured()) {
    return (
      <div
        className={className}
        data-testid="property-map"
        data-placed-count={placedCount}
      >
        <div className="flex h-full w-full items-center justify-center bg-[var(--ops-surface-hover)] p-6 text-center">
          <div className="max-w-sm space-y-2">
            <p className="text-sm font-semibold text-[var(--ops-text)]">Map unavailable</p>
            <p className="text-sm text-[var(--ops-text-muted)]">
              Google Maps API key is not configured. Set{" "}
              <code className="rounded bg-white px-1.5 py-0.5 text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>{" "}
              in your environment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className} data-testid="property-map" data-placed-count={placedCount}>
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <GoogleMap
          mapId={GOOGLE_MAPS_MAP_ID}
          defaultCenter={defaultCenter}
          defaultZoom={placedCount > 0 ? 13 : DEFAULT_MAP_ZOOM}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapTypeControl={true}
          zoomControl={true}
          fullscreenControl={false}
          streetViewControl={false}
          style={{ width: "100%", height: "100%" }}
        >
          <PlacedMarkers
            assets={assets}
            statuses={statuses}
            selectedAssetId={selectedAssetId}
            onSelect={onSelect ?? undefined}
          />
          {placement ? <PendingPlacementMarker placement={placement} /> : null}
          <MapController
            assets={assets}
            focusRequest={focusRequest}
            fitNonce={fitNonce}
            onPlace={onPlace}
            onSelect={onSelect}
            placementMode={placementMode}
          />
        </GoogleMap>
        {/* Data hooks for tests */}
        <span data-testid="map-assets" className="hidden">
          {assets.map((a) => a.name).join(",")}
        </span>
        {placement ? (
          <span data-testid="placement" className="hidden">
            {placement.latitude},{placement.longitude}
          </span>
        ) : null}
      </APIProvider>
    </div>
  );
}
