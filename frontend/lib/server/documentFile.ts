import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { errorJson, serviceUnavailableJson } from "@/lib/server/http";
import { DocumentService } from "@/lib/server/services/documents";
import { requireUuid } from "@/lib/server/validation";
import { createClient } from "@/lib/supabase/server";

export async function serveDocumentFile(
  id: string,
  disposition: "inline" | "attachment",
): Promise<NextResponse> {
  if (!isSupabaseConfigured()) {
    return serviceUnavailableJson("Supabase is not configured.");
  }
  try {
    requireUuid(id, "document_id");
    const client = await createClient();
    const service = new DocumentService(client);
    const { document, data } = await service.readFile(id);
    return new NextResponse(Buffer.from(data), {
      status: 200,
      headers: {
        "Content-Type": document.mime_type ?? "application/octet-stream",
        "Content-Disposition": `${disposition}; filename="${document.filename}"`,
        "Content-Length": String(data.length),
      },
    });
  } catch (e) {
    return errorJson(e);
  }
}
