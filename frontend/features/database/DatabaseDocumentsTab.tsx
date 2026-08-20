"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { DocumentPreviewModal } from "@/features/documents/DocumentPreviewModal";
import { listAssets } from "@/services/assets";
import { downloadDocumentClient, listDocuments } from "@/services/documents";
import { useShell } from "@/stores/shell-context";
import { DOCUMENT_CATEGORIES, type Asset, type Document } from "@/types/domain";

function formatBytes(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * DATABASE → Documents (Phase 3).
 *
 * Global document browse over the existing document/storage system. Records
 * stay associated with their owning property — rows link to the canonical
 * `/dashboard/properties/[id]` route. Preview/download reuse the existing
 * authenticated route handlers. No duplicate records: this is a read-only
 * index; upload/delete management stays in the property workspace.
 */
export function DatabaseDocumentsTab() {
  const { demoMode, refreshKey } = useShell();
  const [docs, setDocs] = useState<Document[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
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
    return listDocuments({
      category: category || undefined,
      search: search || undefined,
      limit: 100,
    });
  }, [category, search]);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((res) => {
        if (cancelled) return;
        let data = res.data;
        if (demoMode) {
          // Demo assets own no documents — keep the view isolated and read-only.
          const demoIds = new Set(assets.map((a) => a.id));
          data = data.filter((d) => demoIds.has(d.asset_id));
        }
        setDocs(data);
        setError(null);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || "Failed to load documents.");
        setDocs([]);
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
        <label className="relative">
          <span className="sr-only">Search documents</span>
          <Icon
            name="search"
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ops-text-muted)]"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search document name, filename…"
            className="h-10 w-full rounded-full border border-transparent bg-white py-2 pl-10 pr-4 text-[14px] text-[var(--ops-text)] shadow-sm placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-border-subtle)] focus:outline-none focus:ring-4 focus:ring-[var(--ops-accent-muted)] transition-all sm:w-64"
          />
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-10 rounded-full border border-transparent bg-white px-4 pr-9 text-[14px] text-[var(--ops-text)] shadow-sm focus:border-[var(--ops-border-subtle)] focus:outline-none focus:ring-4 focus:ring-[var(--ops-accent-muted)] transition-all"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {DOCUMENT_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <p className="ml-auto text-[12px] font-medium text-[var(--ops-text-muted)]">
          Document management happens in the property workspace.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] bg-white shadow-sm">
        {loading ? (
          <div className="space-y-4 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-[var(--ops-radius-lg)]" />
            ))}
          </div>
        ) : null}

        {!loading && error ? (
          <div className="p-6">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : null}

        {!loading && !error && docs.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="NO DOCUMENTS"
              description={
                demoMode
                  ? "The demo dataset has no documents. Demo Mode is read-only."
                  : search || category
                    ? "Try a different search term or category."
                    : "Documents uploaded in the property workspace appear here."
              }
            />
          </div>
        ) : null}

        {!loading && !error && docs.length > 0 ? (
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead className="sticky top-0 z-10 border-b border-[var(--ops-border-subtle)] bg-white/95 text-[12px] font-bold tracking-wider text-[var(--ops-text-muted)] uppercase backdrop-blur-sm">
              <tr>
                <th className="px-6 py-4 font-bold">Name</th>
                <th className="px-6 py-4 font-bold">Property</th>
                <th className="px-6 py-4 font-bold">Category</th>
                <th className="px-6 py-4 font-bold">Type</th>
                <th className="px-6 py-4 font-bold">Size</th>
                <th className="px-6 py-4 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ops-border-subtle)]">
              {docs.map((doc) => {
                const assetName = assetNameById.get(doc.asset_id);
                return (
                  <tr key={doc.id} className="transition-colors hover:bg-[var(--ops-surface-hover)]">
                    <td className="px-6 py-4">
                      <p className="text-[14px] font-semibold text-[var(--ops-text)]">
                        {doc.name}
                      </p>
                      <p className="font-mono text-[11px] text-[var(--ops-text-muted)]">
                        {doc.filename}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {assetName ? (
                        <Link
                          href={`/dashboard/properties/${doc.asset_id}`}
                          className="inline-flex items-center gap-1 text-[14px] font-medium text-[var(--ops-text-secondary)] hover:text-[var(--ops-accent-hover)]"
                        >
                          {assetName}
                          <Icon name="external" size={12} className="text-[var(--ops-text-muted)]" />
                        </Link>
                      ) : (
                        <span className="text-[14px] text-[var(--ops-text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[13px] capitalize text-[var(--ops-text-secondary)]">
                      {doc.category}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-[var(--ops-text-muted)]">
                      {doc.mime_type ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-[13px] text-[var(--ops-text-secondary)]">
                      {formatBytes(doc.size_bytes)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {doc.is_previewable !== false ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreview(doc)}
                          >
                            Preview
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadDocumentClient(doc)}
                        >
                          Download
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}
      </div>

      {preview ? (
        <DocumentPreviewModal document={preview} onClose={() => setPreview(null)} />
      ) : null}
    </div>
  );
}