"use client";

import { useCallback, useEffect, useState } from "react";

import { DocumentPreviewModal } from "@/features/documents/DocumentPreviewModal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { updateAsset } from "@/services/assets";
import {
  deleteDocument,
  getDocumentThumbnailUrl,
  listAssetDocuments,
  uploadDocument,
} from "@/services/documents";
import { useShell } from "@/stores/shell-context";
import { usePermissions } from "@/stores/user-context";
import {
  COVER_DOCUMENT_META_KEY,
  type Asset,
  type Document,
} from "@/types/domain";

type AssetMediaProps = {
  asset: Asset;
  compact?: boolean;
};

export function AssetMedia({ asset, compact = false }: AssetMediaProps) {
  const { demoMode, refreshKey, bumpRefresh } = useShell();
  const { canEdit, canDelete } = usePermissions();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<Document | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const coverId =
    typeof asset.metadata[COVER_DOCUMENT_META_KEY] === "string"
      ? (asset.metadata[COVER_DOCUMENT_META_KEY] as string)
      : null;

  const reload = useCallback(async () => {
    try {
      const res = await listAssetDocuments(asset.id, {
        category: "image",
        limit: 100,
      });
      setDocs(res.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load media.");
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [asset.id]);

  useEffect(() => {
    let cancelled = false;
    listAssetDocuments(asset.id, { category: "image", limit: 100 })
      .then((res) => {
        if (cancelled) return;
        setDocs(res.data);
        setError(null);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || "Failed to load media.");
        setDocs([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [asset.id, reloadToken, refreshKey]);

  async function persistCover(nextCoverId: string | null) {
    const metadata = { ...asset.metadata };
    if (nextCoverId) {
      metadata[COVER_DOCUMENT_META_KEY] = nextCoverId;
    } else {
      delete metadata[COVER_DOCUMENT_META_KEY];
    }
    await updateAsset(asset.id, { metadata });
    bumpRefresh();
  }

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;
    setSaving(true);
    try {
      const res = await uploadDocument({
        asset_id: asset.id,
        file,
        name: file.name.replace(/\.[^.]+$/, ""),
        category: "image",
      });
      setFile(null);
      if (!coverId) {
        await persistCover(res.data.id);
      }
      setLoading(true);
      setReloadToken((n) => n + 1);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload media.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(doc: Document) {
    try {
      await deleteDocument(doc.id);
      if (coverId === doc.id) {
        await persistCover(null);
      }
      setLoading(true);
      setReloadToken((n) => n + 1);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove media.");
    }
  }

  async function handleSetCover(doc: Document) {
    try {
      await persistCover(doc.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to set cover image.",
      );
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold tracking-wider text-[var(--ops-text-muted)] uppercase">
        Photos
      </p>

      {loading ? (
        <div className={cn("grid gap-2", compact ? "grid-cols-2" : "grid-cols-3")}>
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="aspect-square w-full" />
        </div>
      ) : null}

      {!loading && docs.length === 0 ? (
        <p className="text-sm text-[var(--ops-text-secondary)]">
          {demoMode
            ? "Demo Mode is read-only. Turn Demo Mode off to edit real data."
            : "No photos yet."}
        </p>
      ) : null}

      {!loading && docs.length > 0 ? (
        <ul
          className={cn(
            "grid gap-2",
            compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3",
          )}
        >
          {docs.map((doc) => {
            const thumb = getDocumentThumbnailUrl(doc);
            const isCover = coverId === doc.id;
            return (
              <li
                key={doc.id}
                className="overflow-hidden rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-surface)]"
              >
                <button
                  type="button"
                  className="relative block aspect-square w-full bg-[var(--ops-bg)]"
                  onClick={() => setPreview(doc)}
                  aria-label={`Preview ${doc.name}`}
                >
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt={doc.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-[var(--ops-text-muted)]">
                      <Icon name="layers" size={18} />
                    </span>
                  )}
                  {isCover ? (
                    <span className="absolute top-1 left-1 rounded bg-[var(--ops-accent)] px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-white uppercase">
                      Cover
                    </span>
                  ) : null}
                </button>
                <div className="flex items-center justify-between gap-1 px-1.5 py-1">
                  <p className="min-w-0 truncate text-[11px] text-[var(--ops-text)]">
                    {doc.name}
                  </p>
                  <div className="flex shrink-0">
                    {!demoMode && canEdit && !isCover ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label={`Set cover ${doc.name}`}
                        onClick={() => void handleSetCover(doc)}
                      >
                        <Icon name="pin" size={12} />
                      </Button>
                    ) : null}
                    {!demoMode && canDelete ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label={`Delete ${doc.name}`}
                        onClick={() => void handleDelete(doc)}
                      >
                        <Icon name="x" size={12} />
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {!demoMode && canEdit ? (
        <form
          onSubmit={(e) => void handleUpload(e)}
          className="space-y-2 rounded-[var(--ops-radius)] border border-dashed border-[var(--ops-border)] p-3"
        >
          <p className="text-[10px] font-medium text-[var(--ops-text-muted)] uppercase">
            Add photos
          </p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="w-full text-xs text-[var(--ops-text-secondary)]"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
          <Button type="submit" size="sm" variant="secondary" disabled={saving || !file}>
            {saving ? "Uploading…" : "Upload"}
          </Button>
        </form>
      ) : null}

      {error ? (
        <p className="text-sm text-[var(--ops-danger)]" role="alert">
          {error}
        </p>
      ) : null}

      {preview ? (
        <DocumentPreviewModal
          document={preview}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </div>
  );
}
