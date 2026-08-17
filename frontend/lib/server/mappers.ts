import type { Json } from "@/types/database";
import { PREVIEWABLE_MIME_TYPES } from "@/lib/server/constants";
import type {
  AppNotification,
  Asset,
  AssetStatus,
  AssetType,
  Document,
  Project,
} from "@/types/domain";

import type { AssetRow } from "@/lib/server/repositories/assets";
import type { AssetStatusRow } from "@/lib/server/repositories/asset-statuses";
import type { AssetTypeRow } from "@/lib/server/repositories/asset-types";
import type { DocumentRow } from "@/lib/server/repositories/documents";
import type { NotificationRow } from "@/lib/server/repositories/notifications";
import type { ProjectRow } from "@/lib/server/repositories/projects";

/** Strip auditing columns not part of the public API shapes. */
export function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    status: (row.status as Project["status"]) ?? "active",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function toAssetType(row: AssetTypeRow): AssetType {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function toAssetStatus(row: AssetStatusRow): AssetStatus {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    color: row.color,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toStringArray(value: Json): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string");
  }
  return [];
}

export function toAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    project_id: row.project_id,
    asset_type_id: row.asset_type_id,
    asset_status_id: row.asset_status_id,
    name: row.name,
    code: row.code,
    description: row.description,
    owner: row.owner,
    notes: row.notes,
    assignees: toStringArray(row.assignees),
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function toDocument(row: DocumentRow): Document {
  return {
    id: row.id,
    asset_id: row.asset_id,
    name: row.name,
    filename: row.filename,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    storage_path: row.storage_path,
    thumbnail_path: row.thumbnail_path,
    resized_path: row.resized_path,
    category: row.category ?? "other",
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_previewable:
      Boolean(row.storage_path) &&
      (row.mime_type ? PREVIEWABLE_MIME_TYPES.has(row.mime_type) : false),
    has_file: Boolean(row.storage_path),
    has_thumbnail: Boolean(row.thumbnail_path),
  };
}

export function toNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    severity: row.severity,
    kind: row.kind,
    title: row.title,
    message: row.message,
    recipient: row.recipient,
    recipient_email: row.recipient_email,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    read_at: row.read_at,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_read: row.read_at !== null,
  };
}