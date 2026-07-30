/**
 * Domain types mirroring the backend API shapes.
 */

export type UUID = string;

export type ProjectStatus = "active" | "archived";

export type Project = {
  id: UUID;
  name: string;
  slug: string;
  description: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
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

/** RQ job status projection (Phase 9). */
export type JobStatus = {
  id: string;
  status: string;
  description: string | null;
  enqueued_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  result: unknown;
  error: string | null;
};

export type JobEnqueueResult = {
  job_id: string;
  status: string;
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

export type ProjectSummary = {
  project_id: UUID;
  total_assets: number;
  by_status: StatusCount[];
};
