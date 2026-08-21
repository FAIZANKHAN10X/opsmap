/**
 * Geographic helpers shared by the real-map surfaces (workspace + profile).
 * Coordinates are WGS84 degrees stored as first-class `assets` columns.
 */

export type GeoPoint = { latitude: number; longitude: number };

export const LATITUDE_MIN = -90;
export const LATITUDE_MAX = 90;
export const LONGITUDE_MIN = -180;
export const LONGITUDE_MAX = 180;

/** True when an asset carries a complete geographic placement. */
export function isPlaced(
  asset: Pick<import("@/types/domain").Asset, "latitude" | "longitude">,
): asset is typeof asset & GeoPoint {
  return (
    typeof asset.latitude === "number" &&
    Number.isFinite(asset.latitude) &&
    typeof asset.longitude === "number" &&
    Number.isFinite(asset.longitude)
  );
}

/**
 * Basemap style for MapLibre. Provider-independent: point
 * NEXT_PUBLIC_MAP_STYLE_URL at any compatible style document (OpenFreeMap,
 * Protomaps, self-hosted, Mapbox-style, …). Defaults to OpenFreeMap's free
 * "liberty" streets style — no API key, no secrets.
 */
export const DEFAULT_MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/liberty";

/** Fallback view (world) when nothing is placed/focused. */
export const DEFAULT_MAP_CENTER: [number, number] = [0, 20];
export const DEFAULT_MAP_ZOOM = 1.6;
