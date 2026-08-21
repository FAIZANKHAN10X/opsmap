"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { DocumentPreviewModal } from "@/features/documents/DocumentPreviewModal";
import { COVER_DOCUMENT_META_KEY } from "@/types/domain";
import { updateAsset } from "@/services/assets";
import {
  deleteDocument,
  listAssetDocuments,
  uploadDocument,
} from "@/services/documents";
import { useShell } from "@/stores/shell-context";
import { usePermissions } from "@/stores/user-context";
import type { Asset, Document } from "@/types/domain";

type AssetMediaProps = {
  asset: Asset;
  compact?: boolean;
};

export function AssetMedia({ asset, compact = false }: AssetMediaProps) {
  const { demoMode, bumpRefresh, refreshKey } = useShell();
  const { canEdit, canDelete } = usePermissions();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<Document | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(async () => {
    try {
      const res = await listAssetDocuments(asset.id, undefined, demoMode);
      setDocs(res.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load media.");
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [asset.id, demoMode]);

  useEffect(() => {
    let cancelled = false;
    listAssetDocuments(asset.id, undefined, demoMode)
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
  }, [asset.id, demoMode, reloadToken, refreshKey]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadDocument({
        asset_id: asset.id,
        file,
        category: "image",
      });
      if (!asset.metadata[COVER_DOCUMENT_META_KEY]) {
        await handleSetCover(res.data.id);
      }
      setLoading(true);
      setReloadToken((n) => n + 1);
      await reload();
      bumpRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this image?")) return;
    try {
      await deleteDocument(id);
      if (asset.metadata[COVER_DOCUMENT_META_KEY] === id) {
        await handleSetCover(null);
      }
      setLoading(true);
      setReloadToken((n) => n + 1);
      await reload();
      bumpRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  async function handleSetCover(id: string | null) {
    try {
      await updateAsset(asset.id, {
        metadata: {
          ...asset.metadata,
          [COVER_DOCUMENT_META_KEY]: id ?? null,
        },
      });
      bumpRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set cover.");
    }
  }

  const images = docs.filter(
    (d) => d.category === "image" || d.mime_type?.startsWith("image/"),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-bold text-[var(--ops-text)]">
          Photos
        </h3>
        {!demoMode && canEdit ? (
          <div>
            <input
              type="file"
              id={`upload-${asset.id}`}
              className="hidden"
              accept="image/*"
              onChange={(e) => void handleFileSelect(e)}
              disabled={uploading}
            />
            <label
              htmlFor={`upload-${asset.id}`}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--ops-border-subtle)] bg-white px-4 py-2 text-[13px] font-semibold text-[var(--ops-text)] shadow-sm hover:bg-[var(--ops-surface-hover)] hover:text-[var(--ops-accent-hover)] cursor-pointer transition-all disabled:opacity-50"
            >
              <Icon name="upload" size={16} />
              {uploading ? "Uploading…" : "Add Photo"}
            </label>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Skeleton className="aspect-square w-full rounded-[var(--ops-radius-xl)]" />
          <Skeleton className="aspect-square w-full rounded-[var(--ops-radius-xl)]" />
        </div>
      ) : null}

      {!loading && images.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[var(--ops-radius-xl)] border border-dashed border-[var(--ops-border-subtle)] bg-[var(--ops-surface-hover)] p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[var(--ops-text-muted)] mb-3 shadow-sm">
            <Icon name="image" size={24} />
          </div>
          <p className="text-[15px] font-semibold text-[var(--ops-text)] mb-1">
            No photos yet
          </p>
          <p className="text-[13px] text-[var(--ops-text-secondary)]">
            {demoMode ? "Demo Mode is read-only." : "Upload images to showcase this property."}
          </p>
        </div>
      ) : null}

      {images.length > 0 ? (
        <div className={compact ? "grid grid-cols-2 gap-3" : "grid grid-cols-2 gap-4 sm:grid-cols-3"}>
          {images.map((img) => {
            const isCover = asset.metadata[COVER_DOCUMENT_META_KEY] === img.id;
            return (
              <div
                key={img.id}
                className="group relative aspect-square overflow-hidden rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] bg-[var(--ops-surface)] shadow-[var(--ops-shadow-sm)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    img.has_thumbnail
                      ? `/api/documents/${img.id}/thumbnail`
                      : `/api/documents/${img.id}/preview`
                  }
                  alt={img.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />

                {isCover ? (
                  <div className="absolute left-2 top-2 rounded-full bg-[var(--ops-accent)] px-2.5 py-1 text-[10px] font-bold tracking-wide text-white shadow-sm uppercase z-10">
                    Cover
                  </div>
                ) : null}

                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100 backdrop-blur-[2px]">
                  {!demoMode ? (
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-10 w-10 rounded-full border-none bg-white text-[var(--ops-text)] shadow-md hover:scale-105 hover:bg-white"
                      aria-label={`Preview ${img.name}`}
                      onClick={() => setPreview(img)}
                    >
                      <Icon name="layers" size={18} />
                    </Button>
                  ) : null}
                  {!demoMode && canEdit ? (
                    <div className="flex gap-2">
                      {!isCover ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 rounded-full border-none bg-white/90 px-3 text-[12px] font-bold text-[var(--ops-text)] shadow-sm backdrop-blur-sm hover:bg-white"
                          onClick={() => void handleSetCover(img.id)}
                        >
                          Set Cover
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button
                          variant="danger"
                          size="icon"
                          className="h-8 w-8 rounded-full border-none bg-white/90 text-[var(--ops-danger)] shadow-sm backdrop-blur-sm hover:bg-[var(--ops-danger)] hover:text-white"
                          aria-label={`Delete ${img.name}`}
                          onClick={() => void handleDelete(img.id)}
                        >
                          <Icon name="trash" size={14} />
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {error ? (
        <p className="text-[14px] font-medium text-[var(--ops-danger)] bg-[var(--ops-danger-muted)] p-3 rounded-[var(--ops-radius-lg)]" role="alert">
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
