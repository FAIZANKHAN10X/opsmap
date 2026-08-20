"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { DocumentPreviewModal } from "@/features/documents/DocumentPreviewModal";
import { listAssets } from "@/services/assets";
import { listDocuments } from "@/services/documents";
import { useShell } from "@/stores/shell-context";
import type { Asset, Document } from "@/types/domain";

/**
 * DATABASE → Media (Phase 3).
 *
 * Property images surfaced from the existing document/storage system (category
 * `image` or image MIME). Thumbnails/previews stream through the existing
 * authenticated route handlers — nothing is made public. Each tile links to
 * the owning property's canonical detail route. No second media store.
 */
export function DatabaseMediaTab() {
  const { demoMode, refreshKey } = useShell();
  const [images, setImages] = useState<Document[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [preview, setPreview] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const assetNameById = useMemo(
    () => new Map(assets.map((a) => [a.id, a.name])),
    [assets],
  );

  useEffect(() => {
    let cancelled = false;
    listAssets({ limit: 100 }, demoMode)
      .then((res) => {
        if (!cancelled) setAssets(res.data);
      })
      .catch(() => {
        if (!cancelled) setAssets([]);
      });
    return () => {
      cancelled = true;
    };
  }, [demoMode]);

  const load = useCallback(() => {
    return listDocuments({ category: "image", limit: 100 });
  }, []);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((res) => {
        if (cancelled) return;
        let data = res.data;
        if (demoMode) {
          // Demo assets own no media — keep the view isolated and read-only.
          const demoIds = new Set(assets.map((a) => a.id));
          data = data.filter((d) => demoIds.has(d.asset_id));
        }
        setImages(data);
        setError(null);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || "Failed to load media.");
        setImages([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, demoMode, refreshKey, reloadToken]);

  function reload() {
    setLoading(true);
    setReloadToken((n) => n + 1);
  }

  return (
    <div className="flex h-full min-h-0 flex-col p-4 md:p-8">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p className="text-[12px] font-medium text-[var(--ops-text-muted)]">
          Property images from the document store — media management happens in
          the property workspace.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] bg-white shadow-sm">
        {loading ? (
          <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-[var(--ops-radius-xl)]" />
            ))}
          </div>
        ) : null}

        {!loading && error ? (
          <div className="p-6">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : null}

        {!loading && !error && images.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="NO MEDIA"
              description={
                demoMode
                  ? "The demo dataset has no media. Demo Mode is read-only."
                  : "Photos uploaded in the property workspace appear here."
              }
            />
          </div>
        ) : null}

        {!loading && !error && images.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((img) => {
              const assetName = assetNameById.get(img.asset_id);
              return (
                <div
                  key={img.id}
                  className="group overflow-hidden rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] bg-white shadow-[var(--ops-shadow-sm)] transition-shadow hover:shadow-md"
                >
                  <button
                    type="button"
                    className="block aspect-square w-full cursor-zoom-in overflow-hidden bg-[var(--ops-surface)]"
                    onClick={() => setPreview(img)}
                    aria-label={`Preview ${img.name}`}
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
                  </button>
                  <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                    <p className="min-w-0 truncate text-[13px] font-semibold text-[var(--ops-text)]">
                      {img.name}
                    </p>
                    {assetName ? (
                      <Link
                        href={`/dashboard/properties/${img.asset_id}`}
                        className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-[var(--ops-text-secondary)] hover:text-[var(--ops-accent-hover)]"
                      >
                        {assetName}
                        <Icon name="external" size={11} className="text-[var(--ops-text-muted)]" />
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {preview ? (
        <DocumentPreviewModal document={preview} onClose={() => setPreview(null)} />
      ) : null}
    </div>
  );
}