import type { Json } from "@/types/database";

/** Pydantic schema ports. Inputs used by services and Server Actions. */

export type ProjectCreateInput = {
  name: string;
  slug: string;
  description?: string | null;
  status?: string;
};

export type ProjectUpdateInput = {
  name?: string;
  slug?: string;
  description?: string | null;
  status?: string;
};

export type AssetTypeCreateInput = {
  name: string;
  slug: string;
  description?: string | null;
  sort_order?: number;
};

export type AssetTypeUpdateInput = {
  name?: string;
  slug?: string;
  description?: string | null;
  sort_order?: number;
};

export type AssetStatusCreateInput = {
  name: string;
  slug: string;
  description?: string | null;
  color: string;
  sort_order?: number;
};

export type AssetStatusUpdateInput = {
  name?: string;
  slug?: string;
  description?: string | null;
  color?: string;
  sort_order?: number;
};

export type AssetCreateInput = {
  project_id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  asset_type_id?: string | null;
  asset_status_id?: string | null;
  owner?: string | null;
  notes?: string | null;
  assignees?: string[];
  metadata?: Record<string, unknown>;
};

export type AssetUpdateInput = {
  name?: string;
  code?: string | null;
  description?: string | null;
  asset_type_id?: string | null;
  asset_status_id?: string | null;
  owner?: string | null;
  notes?: string | null;
  assignees?: string[];
  metadata?: Record<string, unknown>;
};

export type NotificationCreateInput = {
  severity?: string;
  kind?: string;
  title: string;
  message: string;
  recipient?: string | null;
  recipient_email?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, unknown>;
};

export type NotificationUpdateInput = {
  read?: boolean;
};

export type DocumentCreateInput = {
  asset_id: string;
  name: string;
  filename: string;
  mime_type?: string | null;
  size_bytes?: number | null;
  storage_path?: string | null;
  category?: string;
  notes?: string | null;
};

export type DocumentUpdateInput = {
  name?: string;
  notes?: string | null;
  category?: string;
};

export type DocumentUploadInput = {
  asset_id: string;
  filename: string;
  content_type?: string | null;
  data: Uint8Array;
  name?: string;
  category?: string;
  notes?: string | null;
};

export type ReportGenerateInput = {
  report_type?: string;
  project_id?: string | null;
};

export type AssetListParams = {
  page?: number;
  limit?: number;
  project_id?: string | null;
  asset_type_id?: string | null;
  asset_status_id?: string | null;
  type_slug?: string | null;
  status_slug?: string | null;
  search?: string | null;
  owner?: string | null;
  assigned_to?: string | null;
  created_after?: string | null;
  created_before?: string | null;
  sort?: string;
  order?: string;
};

export type SearchParams = AssetListParams & {
  q?: string | null;
};

export type AssetStatusRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type AssetRow = {
  id: string;
  project_id: string;
  asset_type_id: string | null;
  asset_status_id: string | null;
  name: string;
  code: string | null;
  description: string | null;
  owner: string | null;
  notes: string | null;
  assignees: Json;
  metadata: Json;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type DocumentRow = {
  id: string;
  asset_id: string;
  name: string;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  storage_path: string | null;
  thumbnail_path: string | null;
  resized_path: string | null;
  category: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type NotificationRow = {
  id: string;
  created_at: string;
  updated_at: string;
  severity: string;
  kind: string;
  title: string;
  message: string;
  recipient: string | null;
  recipient_email: string | null;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  metadata: Json;
};

export type ProjectRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type AssetTypeRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};