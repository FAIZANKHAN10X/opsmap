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