export type StatusDefault = {
  name: string;
  slug: string;
  color: string;
  sort_order: number;
  description: string;
};

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