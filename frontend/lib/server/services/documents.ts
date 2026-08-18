import { NotFoundError, ValidationAppError } from "@/lib/server/errors";
import { DocumentRepository, type DocumentRow } from "@/lib/server/repositories/documents";
import { AssetRepository } from "@/lib/server/repositories/assets";
import { SupabaseStorage } from "@/lib/server/storage";
import { processDocumentImage } from "@/lib/server/services/images";
import { audit } from "@/lib/server/audit";
import type { Actor } from "@/lib/server/authorize";
import {
  ALLOWED_MIME_TYPES,
  DOCUMENT_CATEGORIES,
  MAX_UPLOAD_BYTES,
  MIME_CATEGORY_HINTS,
  PREVIEWABLE_MIME_TYPES,
} from "@/lib/server/constants";

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

export type DocumentUploadInput = {
  asset_id: string;
  filename: string;
  content_type?: string | null;
  data: Uint8Array;
  name?: string;
  category?: string;
  notes?: string | null;
};

function stem(filename: string): string {
  const base = filename.split("/").pop() ?? filename;
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(0, dot) : base;
}

export class DocumentService {
  private readonly repo: DocumentRepository;
  private readonly assets: AssetRepository;
  private readonly storage: SupabaseStorage;
  private readonly client: ConstructorParameters<typeof AssetRepository>[0];

  constructor(
    client: ConstructorParameters<typeof AssetRepository>[0],
    private readonly opts: { actor?: Actor | null } = {},
  ) {
    this.client = client;
    this.repo = new DocumentRepository(client);
    this.assets = new AssetRepository(client);
    this.storage = new SupabaseStorage();
  }

  async get(documentId: string): Promise<DocumentRow> {
    const document = await this.repo.getById(documentId);
    if (!document) throw new NotFoundError("DOCUMENT_NOT_FOUND", "Document not found.");
    return document;
  }

  async listForAsset(
    assetId: string,
    opts: { page: number; limit: number; category?: string | null },
  ): Promise<{ items: DocumentRow[]; total: number }> {
    await this._requireAsset(assetId);
    if (opts.category && !DOCUMENT_CATEGORIES.has(opts.category)) {
      throw new ValidationAppError("Invalid category.", [
        { field: "category", message: "Unknown category." },
      ]);
    }
    return this.repo.listByAsset(assetId, {
      page: opts.page,
      limit: opts.limit,
      category: opts.category ?? undefined,
    });
  }

  async listAll(opts: {
    page: number;
    limit: number;
    asset_id?: string | null;
    category?: string | null;
    search?: string | null;
  }): Promise<{ items: DocumentRow[]; total: number }> {
    if (opts.asset_id) await this._requireAsset(opts.asset_id);
    if (opts.category && !DOCUMENT_CATEGORIES.has(opts.category)) {
      throw new ValidationAppError("Invalid category.", [
        { field: "category", message: "Unknown category." },
      ]);
    }
    return this.repo.listAll({
      page: opts.page,
      limit: opts.limit,
      asset_id: opts.asset_id ?? undefined,
      category: opts.category ?? undefined,
      search: opts.search ?? undefined,
    });
  }

  /** Metadata-only create (no binary). Prefer upload(). */
  async create(payload: DocumentCreateInput): Promise<DocumentRow> {
    await this._requireAsset(payload.asset_id);
    const actorId = this.opts.actor?.id ?? null;
    const document = await this.repo.create({
      id: crypto.randomUUID(),
      asset_id: payload.asset_id,
      name: payload.name,
      filename: payload.filename,
      mime_type: payload.mime_type ?? null,
      size_bytes: payload.size_bytes ?? null,
      storage_path: payload.storage_path ?? null,
      category: payload.category ?? "other",
      notes: payload.notes ?? null,
      created_by: actorId,
      updated_by: actorId,
    });
    audit("document.uploaded", {
      document_id: document.id,
      asset_id: document.asset_id,
      filename: document.filename,
      mime_type: document.mime_type,
      size_bytes: document.size_bytes,
      category: document.category,
      created_by: actorId ?? undefined,
    });
    return document;
  }

  async upload(opts: DocumentUploadInput): Promise<DocumentRow> {
    await this._requireAsset(opts.asset_id);

    if (opts.data.length === 0) {
      throw new ValidationAppError("Empty file.", [
        { field: "file", message: "File is empty." },
      ]);
    }
    if (opts.data.length > MAX_UPLOAD_BYTES) {
      throw new ValidationAppError(
        `File exceeds maximum size of ${MAX_UPLOAD_BYTES} bytes.`,
        [{ field: "file", message: "File too large." }],
      );
    }

    const mime = (opts.content_type ?? "application/octet-stream")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mime)) {
      throw new ValidationAppError("File type is not allowed.", [
        {
          field: "file",
          message: `Allowed types: ${[...ALLOWED_MIME_TYPES].sort().join(", ")}`,
        },
      ]);
    }

    const resolvedCategory = (opts.category ?? MIME_CATEGORY_HINTS[mime] ?? "other").toLowerCase();
    if (!DOCUMENT_CATEGORIES.has(resolvedCategory)) {
      throw new ValidationAppError("Invalid category.", [
        { field: "category", message: "Unknown category." },
      ]);
    }

    const displayName = (opts.name ?? stem(opts.filename) ?? "Document").trim();
    const safeFilename = opts.filename.split("/").pop()?.trim() || "file";

    const documentId = crypto.randomUUID();
    const relative = this.storage.buildRelativePath(
      opts.asset_id,
      documentId,
      safeFilename,
    );
    const size = await this.storage.save(relative, opts.data, mime);
    const actorId = this.opts.actor?.id ?? null;

    const document = await this.repo.create({
      id: documentId,
      asset_id: opts.asset_id,
      name: displayName.slice(0, 255),
      filename: safeFilename.slice(0, 512),
      mime_type: mime,
      size_bytes: size,
      storage_path: relative,
      category: resolvedCategory,
      notes: opts.notes ?? null,
      created_by: actorId,
      updated_by: actorId,
    });

    // Image derivatives are generated synchronously (no RQ in the new stack).
    await processDocumentImage(this.client, document.id).catch(() => undefined);

    audit("document.uploaded", {
      document_id: document.id,
      asset_id: document.asset_id,
      filename: document.filename,
      mime_type: document.mime_type,
      size_bytes: document.size_bytes,
      category: document.category,
      created_by: actorId ?? undefined,
    });
    return document;
  }

  async update(documentId: string, payload: DocumentUpdateInput): Promise<DocumentRow> {
    const document = await this.get(documentId);
    const data: Partial<{
      name: string;
      notes: string | null;
      category: string;
      updated_by: string | null;
    }> = {};
    if (payload.name !== undefined) data.name = payload.name;
    if (payload.notes !== undefined) data.notes = payload.notes;
    if (payload.category !== undefined) {
      if (!DOCUMENT_CATEGORIES.has(payload.category)) {
        throw new ValidationAppError("Invalid category.", [
          { field: "category", message: "Unknown category." },
        ]);
      }
      data.category = payload.category;
    }
    data.updated_by = this.opts.actor?.id ?? null;
    return this.repo.update(document.id, data);
  }

  async delete(documentId: string): Promise<void> {
    const document = await this.get(documentId);
    const paths = [document.storage_path, document.thumbnail_path, document.resized_path];
    await this.repo.softDelete(documentId);
    for (const path of paths) {
      await this.storage.delete(path).catch(() => undefined);
    }
    audit("document.deleted", {
      document_id: documentId,
      asset_id: document.asset_id,
      deleted_by: this.opts.actor?.id ?? undefined,
    });
  }

  async readFile(documentId: string): Promise<{ document: DocumentRow; data: Uint8Array }> {
    const document = await this.get(documentId);
    if (!document.storage_path) {
      throw new NotFoundError("FILE_NOT_FOUND", "No file is stored for this document.");
    }
    let data: Uint8Array;
    try {
      data = await this.storage.read(document.storage_path);
    } catch {
      throw new NotFoundError("FILE_NOT_FOUND", "Stored file is missing from disk.");
    }
    return { document, data };
  }

  isPreviewable(document: DocumentRow): boolean {
    return Boolean(document.storage_path) && (document.mime_type
      ? PREVIEWABLE_MIME_TYPES.has(document.mime_type)
      : false);
  }

  private async _requireAsset(assetId: string): Promise<void> {
    if (!(await this.assets.getById(assetId))) {
      throw new NotFoundError("ASSET_NOT_FOUND", "Asset not found.");
    }
  }
}