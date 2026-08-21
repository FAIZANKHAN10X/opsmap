export type StatusDefault = {
  name: string;
  slug: string;
  color: string;
  sort_order: number;
  description: string;
};

export type AssetTypeDefault = {
  name: string;
  slug: string;
  sort_order: number;
  description: string | null;
};

/**
 * Canonical property types (owner-facing taxonomy).
 *
 * Small, sensible set for property management (not consumer marketplace).
 * Mirrors `DEFAULT_ASSET_STATUSES`. The `villa` slug is the primary 8AM HUB
 * type and what Demo (`lib/demo/dataset.ts`) resolves against, so a fresh DB
 * needs it. Others are seeded idempotently via migration
 * 20260822000001_canonical_property_types.sql and via Seed defaults.
 */
export const DEFAULT_ASSET_TYPES: AssetTypeDefault[] = [
  { name: "Villa", slug: "villa", sort_order: 1, description: "Private residence property." },
  { name: "House", slug: "house", sort_order: 2, description: "Standalone house property." },
  { name: "Apartment", slug: "apartment", sort_order: 3, description: "Apartment unit." },
  { name: "Land", slug: "land", sort_order: 4, description: "Land / Plot property." },
  { name: "Commercial", slug: "commercial", sort_order: 5, description: "Commercial property." },
  { name: "Other", slug: "other", sort_order: 6, description: "Other property type." },
];

export const ALLOWED_PROJECT_STATUSES = new Set(["active", "archived"]);

export const DEFAULT_ASSET_STATUSES: StatusDefault[] = [
  { name: "Available", slug: "available", color: "#22c55e", sort_order: 1, description: "Ready for use or sale" },
  { name: "Reserved", slug: "reserved", color: "#38bdf8", sort_order: 2, description: "Held for a pending transaction" },
  { name: "Occupied", slug: "occupied", color: "#f59e0b", sort_order: 3, description: "Currently in use" },
  { name: "Sold", slug: "sold", color: "#c026d3", sort_order: 4, description: "Transaction completed" },
  { name: "Maintenance", slug: "maintenance", color: "#ef4444", sort_order: 5, description: "Temporarily offline for work" },
  { name: "Pending", slug: "pending", color: "#a78bfa", sort_order: 6, description: "Awaiting decision or action" },
  { name: "Offline", slug: "offline", color: "#64748b", sort_order: 7, description: "Not available operationally" },
];

export const NOTIFICATION_SEVERITIES = new Set(["success", "info", "warning", "error"]);
export const NOTIFICATION_KINDS = new Set(["assignment", "system", "email"]);

/**
 * First-class Contacts (Phase 2). Single entity with a `type` category — a
 * label, not a CRM pipeline. `role` is the contact's relationship to a given
 * property via the `property_contacts` join.
 */
export const CONTACT_TYPES = new Set(["lead", "client", "owner", "agent", "vendor", "other"]);
export const PROPERTY_CONTACT_ROLES = new Set(["owner", "assignee", "agent", "client", "vendor", "other"]);

export const DOCUMENT_CATEGORIES = new Set(["contract", "report", "image", "manual", "other"]);

export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "text/plain",
]);

export const PREVIEWABLE_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "text/plain",
]);

export const MIME_CATEGORY_HINTS: Record<string, string> = {
  "application/pdf": "report",
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
  "image/svg+xml": "image",
  "text/plain": "other",
};

export const ALLOWED_SORT_FIELDS = new Set([
  "name",
  "code",
  "owner",
  "created_at",
  "updated_at",
]);

/** Raster formats we can process for derivatives (Pillow in the old backend). */
export const PROCESSABLE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const ALLOWED_REPORT_TYPES = new Set(["project_summary"]);

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const IMAGE_MAX_EDGE = 1920;
export const THUMBNAIL_MAX_EDGE = 256;

export const STORAGE_BUCKET_DOCUMENTS = "documents";
export const STORAGE_BUCKET_REPORTS = "reports";