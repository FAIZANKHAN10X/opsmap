import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/server/errors";
import { STORAGE_BUCKET_DOCUMENTS, STORAGE_BUCKET_REPORTS } from "@/lib/server/constants";

const SAFE_FILENAME_RE = /[^\w.\-()+ ]+/g;

/**
 * _safe_filename equivalent: basename, replace invalid chars with "_", strip
 * leading/trailing dots/underscores/whitespace, cap at 180 chars, "file" fallback.
 */
export function safeFilename(name: string): string {
  const base = name.split("/").pop() ?? name;
  const cleaned = base.replace(SAFE_FILENAME_RE, "_").replace(/^[\s._]+|[\s._]+$/g, "");
  return cleaned.slice(0, 180) || "file";
}

/**
 * Supabase Storage-backed document storage. Replaces the Python
 * LocalFileStorage; document metadata APIs stay unchanged. Files live in the
 * `documents` bucket under `assets/{asset_id}/documents/{document_id}_{safe}`.
 */
export class SupabaseStorage {
  private readonly client: SupabaseClient<Database>;

  constructor(private readonly bucket = STORAGE_BUCKET_DOCUMENTS) {
    this.client = createAdminClient();
  }

  buildRelativePath(assetId: string, documentId: string, filename: string): string {
    const safe = safeFilename(filename);
    return `assets/${assetId}/documents/${documentId}_${safe}`;
  }

  async save(relativePath: string, data: Uint8Array, contentType: string): Promise<number> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(relativePath, data, {
        contentType,
        upsert: true,
      });
    if (error) throw new AppError("STORAGE_UPLOAD_FAILED", "The file could not be stored. Please try again.", 502);
    return data.length;
  }

  async read(relativePath: string): Promise<Uint8Array> {
    const { data, error } = await this.client.storage.from(this.bucket).download(relativePath);
    if (error) throw new AppError("STORAGE_READ_FAILED", "The stored file could not be read.", 502);
    return new Uint8Array(await data.arrayBuffer());
  }

  async delete(relativePath: string | null): Promise<void> {
    if (!relativePath) return;
    const { error } = await this.client.storage.from(this.bucket).remove([relativePath]);
    if (error) throw new AppError("STORAGE_DELETE_FAILED", "The stored file could not be removed.", 502);
  }
}

/** Storage helper for reports (separate bucket). */
export class ReportStorage {
  private readonly client: SupabaseClient<Database>;

  constructor(private readonly bucket = STORAGE_BUCKET_REPORTS) {
    this.client = createAdminClient();
  }

  async save(relativePath: string, data: Uint8Array, contentType: string): Promise<number> {
    const { error } = await this.client.storage.from(this.bucket).upload(relativePath, data, {
      contentType,
      upsert: true,
    });
    if (error) throw new AppError("STORAGE_UPLOAD_FAILED", "The report could not be stored. Please try again.", 502);
    return data.length;
  }
}
