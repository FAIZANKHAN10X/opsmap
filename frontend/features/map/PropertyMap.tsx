"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { GeoJSONSource } from "maplibre-gl";
import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
} from "maplibre-gl";
import type { Point as GeoJSONPoint } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";

import { statusColor } from "@/lib/status-colors";
import type { Asset, AssetStatus } from "@/types/domain";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  DEFAULT_MAP_STYLE_URL,
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

function assetFeatureCollection(assets: Asset[], statuses: AssetStatus[], selectedId: string | null) {
  const statusById = new Map(statuses.map((s) => [s.id, s]));
  return {
    type: "FeatureCollection" as const,
    features: assets.filter(isPlaced).map((asset) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [asset.longitude as number, asset.latitude as number],
      },
      properties: {
        id: asset.id,
        color: statusColor(
          statusById.get(asset.asset_status_id ?? "")?.slug ?? "",
          statusById.get(asset.asset_status_id ?? "")?.color ?? null,
        ),
        selected: asset.id === selectedId ? ("yes" as const) : ("no" as const),
      },
    })),
  };
}

const EMPTY_COLLECTION = { type: "FeatureCollection" as const, features: [] };

/**
 * Real geographic property map (MapLibre GL). Streets/labels/context come from
 * a provider-independent style URL; markers are GeoJSON symbols driven by the
 * same filtered asset list the list view uses — one source of truth.
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const readyRef = useRef(false);
  // Latest callbacks/handlers for stable map event bindings.
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const placeRef = useRef(onPlace);
  placeRef.current = onPlace;
  const placementModeRef = useRef(placementMode);
  placementModeRef.current = placementMode;

  const placedCount = useMemo(() => assets.filter(isPlaced).length, [assets]);
  const data = useMemo(
    () => assetFeatureCollection(assets, statuses, selectedAssetId),
    [assets, statuses, selectedAssetId],
  );
  // Latest collection (already placed-only) for fit computations.
  const placedFeaturesRef = useRef(data);
  placedFeaturesRef.current = data;

  const fitToPlaced = useCallback(
    (immediate = false) => {
      const map = mapRef.current;
      if (!map || !readyRef.current || !isStyleLoadedSafe(map)) return;
      if (placedFeaturesRef.current.features.length === 0) return;
      const first = (
        placedFeaturesRef.current.features[0].geometry as GeoJSONPoint
      ).coordinates as [number, number];
      const bounds = placedFeaturesRef.current.features.reduce(
        (acc, f) =>
          acc.extend((f.geometry as GeoJSONPoint).coordinates as [number, number]),
        new LngLatBounds(first, first),
      );
      map.fitBounds(bounds, {
        padding: 72,
        maxZoom: 16,
        duration: immediate ? 0 : 700,
      });
    },
    [],
  );

  // Initialize once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: DEFAULT_MAP_STYLE_URL,
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
      attributionControl: { compact: true },
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      readyRef.current = true;
      map.addSource("properties", { type: "geojson", data: EMPTY_COLLECTION });

      // Halo ring under the pin for selection emphasis.
      map.addLayer({
        id: "property-halo",
        type: "circle",
        source: "properties",
        paint: {
          "circle-radius": ["case", ["==", ["get", "selected"], "yes"], 16, 0],
          "circle-color": ["get", "color"],
          "circle-opacity": 0.25,
        },
      });

      map.addLayer({
        id: "property-dot",
        type: "circle",
        source: "properties",
        paint: {
          "circle-radius": [
            "case",
            ["==", ["get", "selected"], "yes"],
            9,
            7,
          ],
          "circle-color": "#ffffff",
          "circle-stroke-width": 3.5,
          "circle-stroke-color": ["get", "color"],
          "circle-stroke-opacity": 1,
        },
      });

      map.on("mouseenter", "property-dot", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "property-dot", () => {
        map.getCanvas().style.cursor = placementModeRef.current ? "crosshair" : "";
      });

      map.on("click", "property-dot", (e) => {
        const feature = e.features?.[0] as
          | { properties?: { id?: string } }
          | undefined;
        const id = feature?.properties?.id;
        if (id) selectRef.current?.(id);
      });

      fitToPlaced(true);
      // Re-run pending data/focus after style load.
      setData(data);
    });

    map.on("click", (e) => {
      // Only treat genuine background clicks (not marker hits).
      const hit = map.queryRenderedFeatures(e.point, {
        layers: ["property-dot"],
      });
      if (hit.length > 0) return;
      if (placementModeRef.current) {
        placeRef.current?.({ latitude: e.lngLat.lat, longitude: e.lngLat.lng });
      } else {
        selectRef.current?.(null);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setData(d: ReturnType<typeof assetFeatureCollection>) {
    const map = mapRef.current;
    if (!map || !readyRef.current || !isStyleLoadedSafe(map)) return;
    (map.getSource("properties") as GeoJSONSource | undefined)?.setData(d);
  }

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    setData(data);
    if (!readyRef.current) {
      const onLoad = () => setData(data);
      map.once("load", onLoad);
      return () => {
        map.off("load", onLoad);
        return undefined as void;
      };
    }
    // `setData` reads latest props via the ref-free data dependency above;
    // the map instance is stable so only `data` matters here.
  }, [data]);

  // Auto-fit whenever the set of placed properties changes materially.
  const placedIdsKey = useMemo(
    () =>
      assets
        .filter(isPlaced)
        .map((a) => a.id)
        .sort()
        .join(","),
    [assets],
  );
  const lastFitKeyRef = useRef<string>("");
  useEffect(() => {
    if (placedIdsKey !== lastFitKeyRef.current) {
      lastFitKeyRef.current = placedIdsKey;
      if (placedIdsKey) fitToPlaced();
    }
  }, [placedIdsKey, fitToPlaced]);

  useEffect(() => {
    if (fitNonce > 0) fitToPlaced();
  }, [fitNonce, fitToPlaced]);

  // List → map focus request.
  const lastFocusNonceRef = useRef(0);
  useEffect(() => {
    if (!focusRequest || focusRequest.nonce === lastFocusNonceRef.current) return;
    lastFocusNonceRef.current = focusRequest.nonce;
    const map = mapRef.current;
    const target = assets.find((a) => a.id === focusRequest.assetId);
    if (!map || !target || !isPlaced(target)) return;
    map.flyTo({
      center: [target.longitude as number, target.latitude as number],
      zoom: Math.max(map.getZoom(), 14),
      duration: 700,
      essential: true,
    });
  }, [focusRequest, assets]);

  // Pending placement marker.
  const placementMarkerRef = useRef<Marker | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    if (!placementMarkerRef.current && placement) {
      const el = document.createElement("div");
      el.className = "ops-placement-marker";
      el.innerHTML =
        '<span class="ops-placement-ping"></span><span class="ops-placement-dot"></span>';
      placementMarkerRef.current = new Marker({ element: el })
        .setLngLat([placement.longitude, placement.latitude])
        .addTo(map);
    } else if (placementMarkerRef.current && placement) {
      placementMarkerRef.current.setLngLat([placement.longitude, placement.latitude]);
    } else if (placementMarkerRef.current && !placement) {
      placementMarkerRef.current.remove();
      placementMarkerRef.current = null;
    }
  }, [placement]);

  // Crosshair cursor while placing.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const canvas = map.getCanvas();
    const apply = () => {
      canvas.style.cursor = placementMode ? "crosshair" : "";
    };
    apply();
    map.on("load", apply);
    return () => {
      map.off("load", apply);
    };
  }, [placementMode]);

  return (
    <div className={className} data-testid="property-map" data-placed-count={placedCount}>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

function isStyleLoadedSafe(map: MapLibreMap): boolean {
  try {
    return map.isStyleLoaded() === true;
  } catch {
    return false;
  }
}
