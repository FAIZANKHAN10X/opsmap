"use server";

import type { Document } from "@/types/domain";

import { runAction, runListAction, withServerContext } from "@/lib/server/action-context";
import { toDocument } from "@/lib/server/mappers";
import { parsePagination } from "@/lib/server/pagination";
import { DocumentService } from "@/lib/server/services/documents";

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

export async function listDocumentsForAsset(
  assetId: string,
  params?: { page?: number; limit?: number; category?: string },
) {
  return runListAction<Document>(async () => {
    const { client } = await withServerContext();
    const { page, limit } = parsePagination(params?.page, params?.limit);
    const service = new DocumentService(client);
    const { items, total } = await service.listForAsset(assetId, {
      page,
      limit,
      category: params?.category ?? null,
    });
    return { items: items.map(toDocument), total, page, limit };
  });
}

export async function listDocuments(params?: {
  page?: number;
  limit?: number;
  asset_id?: string;
  category?: string;
  search?: string;
}) {
  return runListAction<Document>(async () => {
    const { client } = await withServerContext();
    const { page, limit } = parsePagination(params?.page, params?.limit);
    const service = new DocumentService(client);
    const { items, total } = await service.listAll({
      page,
      limit,
      asset_id: params?.asset_id ?? null,
      category: params?.category ?? null,
      search: params?.search ?? null,
    });
    return { items: items.map(toDocument), total, page, limit };
  });
}

export async function getDocument(id: string) {
  return runAction<Document>(async () => {
    const { client } = await withServerContext();
    const service = new DocumentService(client);
    return toDocument(await service.get(id));
  });
}

export async function createDocument(payload: DocumentCreateInput) {
  return runAction<Document>(async () => {
    const { client } = await withServerContext();
    const service = new DocumentService(client);
    return toDocument(await service.create(payload));
  });
}

export async function updateDocument(id: string, payload: DocumentUpdateInput) {
  return runAction<Document>(async () => {
    const { client } = await withServerContext();
    const service = new DocumentService(client);
    return toDocument(await service.update(id, payload));
  });
}

export async function deleteDocument(id: string) {
  return runAction<null>(async () => {
    const { client } = await withServerContext();
    const service = new DocumentService(client);
    await service.delete(id);
    return null;
  });
}

/** Upload a document binary from multipart form data. */
export async function uploadDocument(formData: FormData) {
  return runAction<Document>(async () => {
    const { client } = await withServerContext();
    const assetId = formData.get("asset_id");
    const file = formData.get("file");
    if (typeof assetId !== "string" || !(file instanceof File)) {
      throw new Error("asset_id and file are required.");
    }
    const service = new DocumentService(client);
    const data = new Uint8Array(await file.arrayBuffer());
    return toDocument(
      await service.upload({
        asset_id: assetId,
        filename: file.name,
        content_type: file.type || null,
        data,
        name: typeof formData.get("name") === "string" ? (formData.get("name") as string) : undefined,
        category: typeof formData.get("category") === "string" ? (formData.get("category") as string) : undefined,
        notes: typeof formData.get("notes") === "string" ? (formData.get("notes") as string) : undefined,
      }),
    );
  });
}