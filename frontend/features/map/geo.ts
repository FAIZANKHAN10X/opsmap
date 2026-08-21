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
 * Google Maps configuration — reads the public API key and optional Map ID
 * for cloud-based styling / AdvancedMarkerElement.
 */
export const GOOGLE_MAPS_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
export const GOOGLE_MAPS_MAP_ID =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? undefined;

/** True when the Google Maps API key is configured. */
export function isGoogleMapsConfigured(): boolean {
  return GOOGLE_MAPS_API_KEY.length > 0;
}

/**
 * Fallback view when a development has no placed properties and no custom
 * geographic context. Shows the Indonesian archipelago — not the Atlantic
 * ocean — so an empty real development still feels located.
 *
 * NOTE: per-development Map center (e.g. a `center_lat`/`center_lng` on
 * `projects`) can replace this generic fallback later. Until that exists,
 * this regional default is intentionally not Uluwatu-specific.
 */
export const DEFAULT_MAP_CENTER: { lat: number; lng: number } = { lat: -2.5, lng: 118 };
export const DEFAULT_MAP_ZOOM = 5;
