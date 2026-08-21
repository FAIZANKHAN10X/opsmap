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
  /** WGS84 geographic placement (null = unplaced). */
  latitude: number | null;
  longitude: number | null;
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
  /** Geographic placement; both-or-none. Null clears placement. */
  latitude?: number | null;
  longitude?: number | null;
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
  /** Geographic placement; both-or-none. Null clears placement. */
  latitude?: number | null;
  longitude?: number | null;
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

/**
 * First-class Contacts (Phase 2). A contact is a single workspace entity that
 * relates to many properties through the `property_contacts` join — never
 * duplicated per property and never comma-separated ID lists.
 */
export type ContactType =
  | "lead"
  | "client"
  | "owner"
  | "agent"
  | "vendor"
  | "other";

export type PropertyContactRole =
  | "owner"
  | "assignee"
  | "agent"
  | "client"
  | "vendor"
  | "other";

export const CONTACT_TYPES: Array<{ value: ContactType; label: string }> = [
  { value: "lead", label: "Lead" },
  { value: "client", label: "Client" },
  { value: "owner", label: "Owner" },
  { value: "agent", label: "Agent" },
  { value: "vendor", label: "Vendor" },
  { value: "other", label: "Other" },
];

export const PROPERTY_CONTACT_ROLES: Array<{
  value: PropertyContactRole;
  label: string;
}> = [
  { value: "owner", label: "Owner" },
  { value: "assignee", label: "Assignee" },
  { value: "agent", label: "Agent" },
  { value: "client", label: "Client" },
  { value: "vendor", label: "Vendor" },
  { value: "other", label: "Other" },
];

export type ContactPropertyLink = {
  asset_id: UUID;
  asset_name: string;
  project_id: UUID;
  role: PropertyContactRole | string;
};

export type Contact = {
  id: UUID;
  type: ContactType | string;
  full_name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: UUID | null;
  updated_by: UUID | null;
  /** Related properties on list/get (populated by the service). */
  properties: ContactPropertyLink[];
};

export type ContactCreateInput = {
  type: ContactType | string;
  full_name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  notes?: string | null;
  /** Property associations to persist (replaces existing on update). */
  properties?: Array<{ asset_id: UUID; role: PropertyContactRole | string }>;
};

export type ContactUpdateInput = {
  type?: ContactType | string;
  full_name?: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  notes?: string | null;
  properties?: Array<{ asset_id: UUID; role: PropertyContactRole | string }>;
};

/** A contact as linked to a specific property (used on property details). */
export type AssetContact = {
  asset_id: UUID;
  role: PropertyContactRole | string;
  contact: Contact;
};

/** Asset metadata key pointing at the primary/cover document id (image category). */
export const COVER_DOCUMENT_META_KEY = "cover_document_id";

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
