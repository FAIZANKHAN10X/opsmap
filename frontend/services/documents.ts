/**
 * Document metadata service (mock). File binary upload is Phase 8.
 */

import type {
  ApiListSuccess,
  ApiSuccess,
  Document,
  DocumentCreateInput,
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

export async function listAssetDocuments(
  assetId: string,
  params?: { page?: number; limit?: number },
): Promise<ApiListSuccess<Document>> {
  if (USE_MOCK) {
    await delay(200);
    if (mockForceError) throw new Error("Failed to load documents.");
    if (!MOCK_ASSETS.some((a) => a.id === assetId)) {
      throw new Error("Asset not found.");
    }
    const data = MOCK_DOCUMENTS.filter((d) => d.asset_id === assetId);
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 50;
    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: data.length,
        pages: data.length === 0 ? 0 : 1,
      },
      message: null,
    };
  }
  throw new Error("Live API not enabled");
}

export async function createDocument(
  input: DocumentCreateInput,
): Promise<ApiSuccess<Document>> {
  if (USE_MOCK) {
    await delay(200);
    if (!MOCK_ASSETS.some((a) => a.id === input.asset_id)) {
      throw new Error("Asset not found.");
    }
    const stamp = isoNow();
    const doc: Document = {
      id: newId("doc"),
      asset_id: input.asset_id,
      name: input.name.trim(),
      filename: input.filename.trim(),
      mime_type: input.mime_type ?? null,
      size_bytes: input.size_bytes ?? null,
      storage_path: input.storage_path ?? null,
      notes: input.notes ?? null,
      created_at: stamp,
      updated_at: stamp,
    };
    setMockDocuments([doc, ...MOCK_DOCUMENTS]);
    return { success: true, data: doc, message: null };
  }
  throw new Error("Live API not enabled");
}

export async function deleteDocument(id: string): Promise<void> {
  if (USE_MOCK) {
    await delay(150);
    if (!MOCK_DOCUMENTS.some((d) => d.id === id)) {
      throw new Error("Document not found.");
    }
    setMockDocuments(MOCK_DOCUMENTS.filter((d) => d.id !== id));
    return;
  }
  throw new Error("Live API not enabled");
}
