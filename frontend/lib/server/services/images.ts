import "server-only";

import sharp from "sharp";

import type { Client } from "@/lib/server/repositories/base";
import { DocumentRepository } from "@/lib/server/repositories/documents";
import { SupabaseStorage } from "@/lib/server/storage";
import { IMAGE_MAX_EDGE, PROCESSABLE_MIME_TYPES, THUMBNAIL_MAX_EDGE } from "@/lib/server/constants";

const EXT_BY_FORMAT: Record<string, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
};

export function isProcessableImage(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false;
  return PROCESSABLE_MIME_TYPES.has(mimeType.split(";")[0].trim().toLowerCase());
}

export type ImageProcessResult = {
  status: "ok";
  document_id: string;
  thumbnail_path: string;
  resized_path: string;
  base_dir: string;
};

/**
 * process_document_image equivalent, run synchronously at upload time (no RQ
 * in the new stack). Resizes large images and generates a thumbnail, writing
 * derivatives to storage and recording the paths on the document row.
 */
export async function processDocumentImage(
  client: Client,
  documentId: string,
): Promise<ImageProcessResult | { status: "skipped" | "failed"; reason: string }> {
  const repo = new DocumentRepository(client);
  const document = await repo.getById(documentId);
  if (!document) {
    return { status: "skipped", reason: "document_not_found" };
  }
  if (!isProcessableImage(document.mime_type)) {
    return { status: "skipped", reason: "not_processable_image" };
  }
  if (!document.storage_path) {
    return { status: "skipped", reason: "no_storage_path" };
  }

  const storage = new SupabaseStorage();
  let original: Uint8Array;
  try {
    original = await storage.read(document.storage_path);
  } catch {
    return { status: "failed", reason: "file_missing" };
  }

  const baseDir = document.storage_path.split("/").slice(0, -1).join("/");

  // Preferred derivative format mirrors the Python _SAVE_FORMAT mapping.
  const saveFormat = pickSaveFormat(document.mime_type ?? "");
  const ext = EXT_BY_FORMAT[saveFormat] ?? "png";

  try {
    const resizedRel = `${baseDir}/derivatives/${document.id}_resized.${ext}`;
    const resizedBytes = await fitWithin(original, IMAGE_MAX_EDGE, saveFormat);
    await storage.save(resizedRel, resizedBytes, mimeForFormat(saveFormat));

    const thumbRel = `${baseDir}/derivatives/${document.id}_thumb.${ext}`;
    const thumbBytes = await fitWithin(original, THUMBNAIL_MAX_EDGE, saveFormat);
    await storage.save(thumbRel, thumbBytes, mimeForFormat(saveFormat));

    const updated = await repo.update(document.id, {
      thumbnail_path: thumbRel,
      resized_path: resizedRel,
    } as never);

    return {
      status: "ok",
      document_id: document.id,
      thumbnail_path: updated.thumbnail_path ?? thumbRel,
      resized_path: updated.resized_path ?? resizedRel,
      base_dir: baseDir,
    };
  } catch {
    return { status: "failed", reason: "unreadable_image" };
  }
}

function fitWithin(data: Uint8Array, maxEdge: number, format: "jpeg" | "png" | "webp"): Promise<Buffer> {
  let pipeline = sharp(data as Buffer).rotate();
  const meta = pipeline.metadata();
  return meta
    .then((m) => {
      const w = m.width ?? 0;
      const h = m.height ?? 0;
      const longest = Math.max(w, h);
      if (longest <= maxEdge) {
        pipeline = pipeline.clone().resize({ width: w, height: h });
      } else {
        pipeline = pipeline.clone().resize({ width: maxEdge, height: maxEdge, fit: "inside" });
      }
      const opts = format === "jpeg" ? { quality: 85, mozjpeg: true } : {};
      return pipeline.toFormat(format, opts).toBuffer();
    })
    .catch(() => Promise.reject(new Error("unreadable_image")));
}

function pickSaveFormat(mimeType: string): "jpeg" | "png" | "webp" {
  const sub = mimeType.split("/")[1]?.toLowerCase() ?? "";
  if (sub === "jpeg" || sub === "jpg") return "jpeg";
  if (sub === "webp") return "webp";
  return "png";
}

function mimeForFormat(format: "jpeg" | "png" | "webp"): string {
  if (format === "jpeg") return "image/jpeg";
  if (format === "webp") return "image/webp";
  return "image/png";
}