/**
 * Domain types mirroring the backend API shapes.
 */

export type UUID = string;

export type ProjectStatus = "active" | "archived";

/**
 * Business-user roles (Phase 14). Scoped to the single-company RLS model:
 * every authenticated user sees the shared workspace, roles only gate writes.
 */
export type UserRole = "admin" | "manager" | "operator" | "viewer";

/**
 * Admin users/roles surface (Phase 15): the subset of a profile row that is
 * safe to expose in the Settings user list. No invented fields — mirrors the
 * profiles table exactly.
 */
export type ProfileSummary = {
  id: UUID;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: UUID;
  name: string;
  slug: string;
  description: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  created_by: UUID | null;
  updated_by: UUID | null;
};

export type AssetType = {
  id: UUID;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type AssetStatus = {
  id: UUID;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Asset = {
  id: UUID;
  project_id: UUID;
  asset_type_id: UUID | null;
  asset_status_id: UUID | null;
  name: string;
  code: string | null;
  description: string | null;
  owner: string | null;
  notes: string | null;
  assignees: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: UUID | null;
  updated_by: UUID | null;
};

export type DocumentCategory =
  | "contract"
  | "report"
  | "image"
  | "manual"
  | "other";

export type Document = {
  id: UUID;
  asset_id: UUID;
  name: string;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  storage_path: string | null;
  thumbnail_path?: string | null;
  resized_path?: string | null;
  category: DocumentCategory | string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  is_previewable?: boolean;
  has_file?: boolean;
  has_thumbnail?: boolean;
};

/** In-app notification (Phase 10). */
export type NotificationSeverity = "success" | "info" | "warning" | "error";
export type NotificationKind = "assignment" | "system" | "email";

export type AppNotification = {
  id: UUID;
  severity: NotificationSeverity | string;
  kind: NotificationKind | string;
  title: string;
  message: string;
  recipient: string | null;
  recipient_email: string | null;
  entity_type: string | null;
  entity_id: UUID | null;
  read_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  is_read: boolean;
};

export type AssetCreateInput = {
  project_id: UUID;
  name: string;
  code?: string | null;
  description?: string | null;
  asset_type_id?: UUID | null;
  asset_status_id?: UUID | null;
  owner?: string | null;
  notes?: string | null;
  assignees?: string[];
  metadata?: Record<string, unknown>;
};

export type AssetUpdateInput = {
  name?: string;
  code?: string | null;
  description?: string | null;
  asset_type_id?: UUID | null;
  asset_status_id?: UUID | null;
  owner?: string | null;
  notes?: string | null;
  assignees?: string[];
  metadata?: Record<string, unknown>;
};

export type DocumentCreateInput = {
  asset_id: UUID;
  name: string;
  filename: string;
  mime_type?: string | null;
  size_bytes?: number | null;
  storage_path?: string | null;
  category?: DocumentCategory | string;
  notes?: string | null;
};

export const DOCUMENT_CATEGORIES: Array<{
  value: DocumentCategory;
  label: string;
}> = [
  { value: "contract", label: "Contract" },
  { value: "report", label: "Report" },
  { value: "image", label: "Image" },
  { value: "manual", label: "Manual" },
  { value: "other", label: "Other" },
];

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type ApiSuccess<T> = {
  success: true;
  data: T;
  message: string | null;
};

export type ApiListSuccess<T> = {
  success: true;
  data: T[];
  pagination: PaginationMeta;
  message: string | null;
};

export type StatusCount = {
  status_id: UUID;
  status_slug: string;
  status_name: string;
  color: string;
  count: number;
};

/**
 * 8AM HUB dashboard KPIs (Phase 11), computed from real data on the server.
 * Definitions (documented, product-confirmable):
 * - placed / placed_capacity  → PLACED (OPS): placed pax vs total pax capacity
 * - villa_capacity            → VILLA CAPACITY: villas holding capacity (>0)
 * - spots_open                → SPOTS OPEN: villas whose status maps to OPEN
 * - villas_sold_out / total_villas → VILLAS SOLD OUT
 * Capacity & placed come from asset metadata (`capacity`/`pax`, `placed`).
 */
export type HubKpis = {
  placed: number;
  placed_capacity: number;
  villa_capacity: number;
  spots_open: number;
  villas_sold_out: number;
  total_villas: number;
};

export type ProjectSummary = {
  project_id: UUID;
  total_assets: number;
  document_count?: number;
  by_status: StatusCount[];
  /** Present on dashboard summaries (buildProjectSummary); absent on report-derived summaries. */
  kpis?: HubKpis;
};
