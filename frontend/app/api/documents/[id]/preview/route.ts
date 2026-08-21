import { methodNotAllowedJson } from "@/lib/server/http";
import { serveDocumentFile } from "@/lib/server/documentFile";

/**
 * GET /api/documents/[id]/preview — inline file response for browser preview.
 * Mirrors GET /api/v1/documents/{document_id}/preview.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return serveDocumentFile(id, "inline");
}

export function POST() {
  return methodNotAllowedJson();
}