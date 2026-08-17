import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { errorJson, methodNotAllowedJson, serviceUnavailableJson } from "@/lib/server/http";
import { DocumentService } from "@/lib/server/services/documents";
import { requireUuid } from "@/lib/server/validation";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/documents/[id]/download — attachment file response.
 * Mirrors GET /api/v1/documents/{document_id}/download.
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
    const service = new DocumentService(client);
    const { document, data } = await service.readFile(id);
    return new NextResponse(Buffer.from(data), {
      status: 200,
      headers: {
        "Content-Type": document.mime_type ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${document.filename}"`,
        "Content-Length": String(data.length),
      },
    });
  } catch (e) {
    return errorJson(e);
  }
}

export function POST() {
  return methodNotAllowedJson();
}