/**
 * Domain types mirroring the backend API shapes.
 * Used by mock services and future real API clients.
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
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

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

/** Aggregated KPI payload for the dashboard shell. */
export type ProjectSummary = {
  project_id: UUID;
  total_assets: number;
  by_status: StatusCount[];
};
