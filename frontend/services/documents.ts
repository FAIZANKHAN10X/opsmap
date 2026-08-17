/**
 * Document service — delegates to Server Actions + API route handlers backed
 * by Supabase. Mirrors Phase 8 API (multipart upload + download/preview).
 */

import type {
  ApiListSuccess,
  ApiSuccess,
  Document,
  DocumentCategory,
} from "@/types/domain";

import {
  deleteDocument as deleteDocumentAction,
  listDocuments as listDocumentsAction,
  listDocumentsForAsset as listDocumentsForAssetAction,
  uploadDocument as uploadDocumentAction,
} from "@/actions/documents";
import { unwrapAction, unwrapListAction } from "@/services/helpers";

export type ListDocumentsParams = {
  asset_id?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export async function listDocuments(
  params: ListDocumentsParams = {},
): Promise<ApiListSuccess<Document>> {
  return unwrapListAction(
    await listDocumentsAction({
      page: params.page,
      limit: params.limit,
      asset_id: params.asset_id,
      category: params.category,
      search: params.search,
    }),
  );
}

export async function listAssetDocuments(
  assetId: string,
  params?: { page?: number; limit?: number; category?: string },
): Promise<ApiListSuccess<Document>> {
  return unwrapListAction(await listDocumentsForAssetAction(assetId, params));
}

export async function uploadDocument(input: {
  asset_id: string;
  file: File;
  name?: string;
  category?: DocumentCategory | string;
  notes?: string;
}): Promise<ApiSuccess<Document>> {
  const formData = new FormData();
  formData.set("asset_id", input.asset_id);
  formData.set("file", input.file);
  if (input.name) formData.set("name", input.name);
  if (input.category) formData.set("category", input.category);
  if (input.notes) formData.set("notes", input.notes);
  return unwrapAction(await uploadDocumentAction(formData));
}

export async function deleteDocument(id: string): Promise<void> {
  unwrapAction(await deleteDocumentAction(id));
}

/**
 * Preview URL for images/PDFs. Points at the inline route handler which streams
 * the file from Supabase storage. Returns null for non-previewable or
 * metadata-only rows.
 */
export function getDocumentObjectUrl(doc: Document): string | null {
  if (doc.has_file === false) return null;
  const mime = doc.mime_type ?? "";
  const previewable = mime.startsWith("image/") || mime === "application/pdf";
  if (!previewable) return null;
  return `/api/documents/${doc.id}/preview`;
}

/** Trigger a browser download via the attachment route handler. */
export function downloadDocumentClient(doc: Document): void {
  triggerDownload(`/api/documents/${doc.id}/download`, doc.filename);
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}