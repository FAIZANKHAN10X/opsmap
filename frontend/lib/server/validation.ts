import { ValidationAppError } from "@/lib/server/errors";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * normalize_slug equivalent. Lowercases, converts underscores/whitespace to
 * hyphens, collapses runs of hyphens, and validates the result. Throws a 422
 * VALIDATION_ERROR with a `slug` field on failure.
 */
export function normalizeSlug(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug || !SLUG_PATTERN.test(slug)) {
    throw new ValidationAppError(
      "Invalid slug. Use lowercase letters, numbers, and single hyphens.",
      [{ field: "slug", message: "Invalid slug. Use lowercase letters, numbers, and single hyphens." }],
    );
  }
  if (slug.length > 100) {
    throw new ValidationAppError("Slug must be at most 100 characters.", [
      { field: "slug", message: "Slug must be at most 100 characters." },
    ]);
  }
  return slug;
}

/**
 * normalize_hex_color equivalent. Validates #rgb / #rrggbb and lowercases.
 */
export function normalizeHexColor(value: string): string {
  const cleaned = value.trim();
  if (!HEX_COLOR_PATTERN.test(cleaned)) {
    throw new ValidationAppError(
      "Color must be a hex value like #22c55e or #fff.",
      [{ field: "color", message: "Color must be a hex value like #22c55e or #fff." }],
    );
  }
  return cleaned.toLowerCase();
}

/** _normalize_assignees equivalent: trim, drop empties, dedupe preserving order. */
export function normalizeAssignees(value: string[] | null | undefined): string[] {
  if (!value) return [];
  const cleaned: string[] = [];
  for (const item of value) {
    const name = item.trim();
    if (name && !cleaned.includes(name)) {
      cleaned.push(name);
    }
  }
  return cleaned;
}

/** looks_like_email equivalent (mirrors the backend regex). */
export function looksLikeEmail(value: string | null | undefined): boolean {
  if (!value) return false;
  return EMAIL_PATTERN.test(value.trim());
}

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/** FastAPI path-param UUID validation equivalent: throws a 422 for bad ids. */
export function requireUuid(value: string | null | undefined, field: string): void {
  if (!value || !isUuid(value)) {
    throw new ValidationAppError("Input should be a valid UUID.", [
      { field, message: "Input should be a valid UUID." },
    ]);
  }
}

/** Escape PostgREST ILIKE wildcards and separator commas. */
export function escapeIlike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_").replace(/,/g, "\\,");
}

export function requireName(value: string, field = "name"): string {
  const cleaned = value.trim();
  if (!cleaned) throw new ValidationAppError("name is required", [{ field, message: "name is required" }]);
  return cleaned;
}

/**
 * WGS84 coordinate validation for the real geographic map. Coordinates are
 * first-class `assets` columns (not metadata). Both must be provided together
 * or not at all; `null` clears placement.
 */
export const LATITUDE_MIN = -90;
export const LATITUDE_MAX = 90;
export const LONGITUDE_MIN = -180;
export const LONGITUDE_MAX = 180;

export function validateLatitude(value: number): number {
  if (!Number.isFinite(value) || value < LATITUDE_MIN || value > LATITUDE_MAX) {
    throw new ValidationAppError(
      `latitude must be a number between ${LATITUDE_MIN} and ${LATITUDE_MAX}.`,
      [{ field: "latitude", message: `latitude must be a number between ${LATITUDE_MIN} and ${LATITUDE_MAX}.` }],
    );
  }
  return value;
}

export function validateLongitude(value: number): number {
  if (!Number.isFinite(value) || value < LONGITUDE_MIN || value > LONGITUDE_MAX) {
    throw new ValidationAppError(
      `longitude must be a number between ${LONGITUDE_MIN} and ${LONGITUDE_MAX}.`,
      [{ field: "longitude", message: `longitude must be a number between ${LONGITUDE_MIN} and ${LONGITUDE_MAX}.` }],
    );
  }
  return value;
}

/**
 * Normalizes an optional (latitude, longitude) pair from user input:
 * both-or-none, finite, in range. Returns null when unplaced
 * (undefined/null/empty inputs), else the coerced pair.
 */
export function normalizeCoordinates(
  latitude: unknown,
  longitude: unknown,
): { latitude: number; longitude: number } | null {
  const hasLat = latitude !== undefined && latitude !== null && latitude !== "";
  const hasLng = longitude !== undefined && longitude !== null && longitude !== "";
  if (!hasLat && !hasLng) return null;
  if (hasLat !== hasLng) {
    throw new ValidationAppError("latitude and longitude must be provided together.", [
      { field: "latitude", message: "latitude and longitude must be provided together." },
    ]);
  }
  return {
    latitude: validateLatitude(Number(latitude)),
    longitude: validateLongitude(Number(longitude)),
  };
}

/**
 * 8AM HUB operational fields stored in asset metadata, as validated by
 * `normalizeOperationalMetadata`. `capacity`/`pax` are aliases for the same
 * count; `placed` is the count of occupied positions.
 */
export const OPERATIONAL_COUNT_KEYS = ["capacity", "pax", "placed"] as const;
export const OPERATIONAL_COORD_KEYS = ["map_x", "map_y"] as const;

/** Property detail fields stored in metadata (canonical property model). */
export const PROPERTY_DETAIL_INTEGER_KEYS = ["bedrooms", "parking"] as const;
export const PROPERTY_DETAIL_NUMERIC_KEYS = ["bathrooms", "area_sqm", "plot_area_sqm", "price"] as const;

/**
 * Validate the operational fields carried in `assets.metadata`.
 *
 * Phase 15 Decision Checkpoint 1: keep the generalized `assets.metadata` JSONB
 * model instead of promoting capacity/placed/map_x/map_y to typed columns. The
 * KPI path already reads these robustly (string or number, 0 default), and
 * typed columns would re-specialize the deliberately general `assets` model
 * while adding backfill/dual-source complexity — without simplifying the owner
 * workflow. Validation therefore lives at the service boundary:
 * capacity/pax/placed must be non-negative integers, map_x/map_y finite
 * numbers. Empty values are dropped; unrelated metadata keys are preserved.
 * Throws a 422 VALIDATION_ERROR on invalid values.
 */
export function normalizeOperationalMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const out = { ...(metadata ?? {}) };
  // Reject prototype pollution keys.
  for (const k of ["__proto__", "constructor", "prototype"]) delete (out as Record<string, unknown>)[k];
  for (const key of [...OPERATIONAL_COUNT_KEYS, ...OPERATIONAL_COORD_KEYS]) {
    const value = out[key];
    if (value === undefined || value === null || value === "") {
      delete out[key];
      continue;
    }
    const num = Number(value);
    if (!Number.isFinite(num)) {
      throw new ValidationAppError(`${key} must be a finite number.`, [
        { field: key, message: `${key} must be a finite number.` },
      ]);
    }
    if ((OPERATIONAL_COUNT_KEYS as readonly string[]).includes(key)) {
      if (!Number.isInteger(num) || num < 0) {
        throw new ValidationAppError(`${key} must be a non-negative integer.`, [
          { field: key, message: `${key} must be a non-negative integer.` },
        ]);
      }
      out[key] = num;
    } else {
      out[key] = num;
    }
  }
  // Property detail validation (canonical model)
  for (const key of [...PROPERTY_DETAIL_INTEGER_KEYS]) {
    const value = out[key];
    if (value === undefined || value === null || value === "") {
      delete out[key];
      continue;
    }
    const num = Number(value);
    if (!Number.isInteger(num) || num < 0) {
      throw new ValidationAppError(`${key} must be a non-negative integer.`, [
        { field: key, message: `${key} must be a non-negative integer.` },
      ]);
    }
    out[key] = num;
  }
  for (const key of [...PROPERTY_DETAIL_NUMERIC_KEYS]) {
    const value = out[key];
    if (value === undefined || value === null || value === "") {
      delete out[key];
      continue;
    }
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) {
      throw new ValidationAppError(`${key} must be a non-negative number.`, [
        { field: key, message: `${key} must be a non-negative number.` },
      ]);
    }
    // bathrooms allows .5, area/price allow decimals
    out[key] = num;
  }
  // String fields: floor, address, view, furnishing — trim, drop empty, cap length
  for (const key of ["floor", "address", "view", "furnishing"]) {
    const value = out[key];
    if (value === undefined || value === null) {
      delete out[key];
      continue;
    }
    const str = String(value).trim();
    if (!str) {
      delete out[key];
      continue;
    }
    if (str.length > 500) {
      throw new ValidationAppError(`${key} must be at most 500 characters.`, [
        { field: key, message: `${key} must be at most 500 characters.` },
      ]);
    }
    out[key] = str;
  }
  // Features / amenities: string array, normalized
  if (out.features !== undefined) {
    if (out.features === null || out.features === "") {
      delete out.features;
    } else if (Array.isArray(out.features)) {
      const cleaned = (out.features as unknown[])
        .map((v) => String(v).trim())
        .filter((v) => v.length > 0)
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 30);
      if (cleaned.length === 0) delete out.features;
      else out.features = cleaned;
    } else {
      throw new ValidationAppError("features must be an array.", [
        { field: "features", message: "features must be an array." },
      ]);
    }
  }
  // Currency: 3-letter code if present
  if (out.currency !== undefined) {
    if (out.currency === null || out.currency === "") {
      delete out.currency;
    } else {
      const cur = String(out.currency).trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(cur)) {
        throw new ValidationAppError("currency must be a 3-letter code.", [
          { field: "currency", message: "currency must be a 3-letter code." },
        ]);
      }
      out.currency = cur;
    }
  }
  // Bound serialized size to prevent jsonb bloat (approx 4096 bytes).
  const serialized = JSON.stringify(out);
  if (serialized.length > 4096) {
    throw new ValidationAppError("metadata is too large (max 4096 bytes).", [
      { field: "metadata", message: "metadata is too large (max 4096 bytes)." },
    ]);
  }
  return out;
}