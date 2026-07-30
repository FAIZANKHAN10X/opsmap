/**
 * Document service — mock-backed upload/list/delete with preview URLs.
 * Mirrors Phase 8 API (multipart upload + download/preview).
 */

import type {
  ApiListSuccess,
  ApiSuccess,
  Document,
  DocumentCategory,
} from "@/types/domain";

import {
  MOCK_ASSETS,
  MOCK_DOCUMENTS,
  isoNow,
  mockForceError,
  newId,
  setMockDocuments,
} from "@/services/mock/data";
import { delay } from "@/services/mock/delay";

const USE_MOCK = true;

/** In-memory binary store for mock previews (blob URLs). */
const mockBlobs = new Map<string, { blob: Blob; mime: string; filename: string }>();

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
  if (USE_MOCK) {
    await delay(180);
    if (mockForceError) throw new Error("Failed to load documents.");
    let data = [...MOCK_DOCUMENTS];
    if (params.asset_id) {
      data = data.filter((d) => d.asset_id === params.asset_id);
    }
    if (params.category) {
      data = data.filter((d) => d.category === params.category);
    }
    if (params.search?.trim()) {
      const q = params.search.trim().toLowerCase();
      data = data.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.filename.toLowerCase().includes(q) ||
          (d.notes?.toLowerCase().includes(q) ?? false),
      );
    }
    const page = params.page ?? 1;
    const limit = params.limit ?? 50;
    const start = (page - 1) * limit;
    const slice = data.slice(start, start + limit).map(enrich);
    return {
      success: true,
      data: slice,
      pagination: {
        page,
        limit,
        total: data.length,
        pages: data.length === 0 ? 0 : Math.ceil(data.length / limit),
      },
      message: null,
    };
  }
  throw new Error("Live API not enabled");
}

export async function listAssetDocuments(
  assetId: string,
  params?: { page?: number; limit?: number; category?: string },
): Promise<ApiListSuccess<Document>> {
  return listDocuments({
    asset_id: assetId,
    page: params?.page,
    limit: params?.limit,
    category: params?.category,
  });
}

export async function uploadDocument(input: {
  asset_id: string;
  file: File;
  name?: string;
  category?: DocumentCategory | string;
  notes?: string;
}): Promise<ApiSuccess<Document>> {
  if (USE_MOCK) {
    await delay(300);
    if (!MOCK_ASSETS.some((a) => a.id === input.asset_id)) {
      throw new Error("Asset not found.");
    }
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "text/plain",
    ];
    if (!allowed.includes(input.file.type) && input.file.type !== "") {
      // Allow empty type from some browsers for pdf if extension matches
      if (!input.file.name.toLowerCase().endsWith(".pdf")) {
        throw new Error("File type is not allowed.");
      }
    }
    if (input.file.size === 0) throw new Error("Empty file.");
    if (input.file.size > 10 * 1024 * 1024) throw new Error("File too large.");

    const stamp = isoNow();
    const id = newId("doc");
    const mime =
      input.file.type ||
      (input.file.name.endsWith(".pdf") ? "application/pdf" : "application/octet-stream");
    const category =
      input.category ||
      (mime.startsWith("image/")
        ? "image"
        : mime === "application/pdf"
          ? "report"
          : "other");

    const doc: Document = {
      id,
      asset_id: input.asset_id,
      name: (input.name || input.file.name.replace(/\.[^.]+$/, "")).trim(),
      filename: input.file.name,
      mime_type: mime,
      size_bytes: input.file.size,
      storage_path: `mock://${id}`,
      category,
      notes: input.notes ?? null,
      created_at: stamp,
      updated_at: stamp,
      has_file: true,
      is_previewable:
        mime.startsWith("image/") ||
        mime === "application/pdf" ||
        mime === "text/plain",
    };

    mockBlobs.set(id, {
      blob: input.file,
      mime,
      filename: input.file.name,
    });
    setMockDocuments([doc, ...MOCK_DOCUMENTS]);
    return { success: true, data: enrich(doc), message: null };
  }
  throw new Error("Live API not enabled");
}

export async function deleteDocument(id: string): Promise<void> {
  if (USE_MOCK) {
    await delay(150);
    if (!MOCK_DOCUMENTS.some((d) => d.id === id)) {
      throw new Error("Document not found.");
    }
    mockBlobs.delete(id);
    setMockDocuments(MOCK_DOCUMENTS.filter((d) => d.id !== id));
    return;
  }
  throw new Error("Live API not enabled");
}

/** Object URL for preview/download in mock mode. Caller should revoke when done if needed. */
export function getDocumentObjectUrl(doc: Document): string | null {
  const stored = mockBlobs.get(doc.id);
  if (stored) {
    return URL.createObjectURL(stored.blob);
  }
  // Synthetic preview for seed mock docs without blobs
  if (doc.mime_type?.startsWith("image/")) {
    return null;
  }
  if (doc.mime_type === "application/pdf") {
    const blob = new Blob(["%PDF-1.4 mock preview"], {
      type: "application/pdf",
    });
    return URL.createObjectURL(blob);
  }
  return null;
}

export function downloadDocumentClient(doc: Document): void {
  const url = getDocumentObjectUrl(doc);
  if (!url) {
    // Fallback: generate tiny text download for metadata-only mock rows
    const blob = new Blob(
      [`OpsMap mock document\n${doc.name}\n${doc.filename}\n`],
      { type: "text/plain" },
    );
    const fallback = URL.createObjectURL(blob);
    triggerDownload(fallback, doc.filename);
    URL.revokeObjectURL(fallback);
    return;
  }
  triggerDownload(url, doc.filename);
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

function enrich(doc: Document): Document {
  const mime = doc.mime_type || "";
  return {
    ...doc,
    category: doc.category || "other",
    has_file: Boolean(doc.storage_path) || mockBlobs.has(doc.id),
    is_previewable:
      mime.startsWith("image/") ||
      mime === "application/pdf" ||
      mime === "text/plain",
  };
}
