import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { NotFoundError } from "@/lib/server/errors";
import { errorJson, methodNotAllowedJson, serviceUnavailableJson } from "@/lib/server/http";
import { SupabaseStorage } from "@/lib/server/storage";
import { requireUuid } from "@/lib/server/validation";
import { DocumentRepository } from "@/lib/server/repositories/documents";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/documents/[id]/thumbnail — serve the generated thumbnail.
 * Mirrors GET /api/v1/documents/{document_id}/thumbnail.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured()) {
    return serviceUnavailableJson("Supabase is not configured.");
  }
  const { id } = await params;
  try {
    requireUuid(id, "document_id");
    const client = await createClient();
    const repo = new DocumentRepository(client);
    const document = await repo.getById(id);
    if (!document) {
      throw new NotFoundError("DOCUMENT_NOT_FOUND", "Document not found.");
    }
    if (!document.thumbnail_path) {
      throw new NotFoundError(
        "THUMBNAIL_NOT_FOUND",
        "Thumbnail has not been generated for this document yet.",
      );
    }

    const storage = new SupabaseStorage();
    let data: Uint8Array;
    try {
      data = await storage.read(document.thumbnail_path);
    } catch {
      throw new NotFoundError("THUMBNAIL_NOT_FOUND", "Thumbnail file is missing from disk.");
    }

    const path = document.thumbnail_path.toLowerCase();
    let media = "image/png";
    if (path.endsWith(".jpg") || path.endsWith(".jpeg")) media = "image/jpeg";
    else if (path.endsWith(".webp")) media = "image/webp";

    return new NextResponse(Buffer.from(data), {
      status: 200,
      headers: {
        "Content-Type": media,
        "Content-Disposition": 'inline; filename="thumbnail"',
        "Content-Length": String(data.length),
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    return errorJson(e);
  }
}

export function POST() {
  return methodNotAllowedJson();
}