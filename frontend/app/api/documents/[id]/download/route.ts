import { methodNotAllowedJson } from "@/lib/server/http";
import { serveDocumentFile } from "@/lib/server/documentFile";

/**
 * GET /api/documents/[id]/download — attachment file response.
 * Mirrors GET /api/v1/documents/{document_id}/download.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return serveDocumentFile(id, "attachment");
}

export function POST() {
  return methodNotAllowedJson();
}