"use client";

import { useEffect, useMemo, useState } from "react";

import { DocumentPreviewModal } from "@/features/documents/DocumentPreviewModal";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  deleteDocument,
  downloadDocumentClient,
  listDocuments,
  uploadDocument,
} from "@/services/documents";
import { listAssets } from "@/services/assets";
import { useShell } from "@/stores/shell-context";
import { useToast } from "@/stores/toast-context";
import {
  DOCUMENT_CATEGORIES,
  type Asset,
  type Document,
  type DocumentCategory,
} from "@/types/domain";

function formatBytes(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsPage() {
  const { selectedProjectId, demoMode } = useShell();
  const toast = useToast();
  const [docs, setDocs] = useState<Document[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [assetFilter, setAssetFilter] = useState("");
  const [preview, setPreview] = useState<Document | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // Upload form
  const [uploadAssetId, setUploadAssetId] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] =
    useState<DocumentCategory>("other");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const assetNameById = useMemo(
    () => new Map(assets.map((a) => [a.id, a.name])),
    [assets],
  );

  useEffect(() => {
    if (!selectedProjectId) return;
    let cancelled = false;
    listAssets({ project_id: selectedProjectId, limit: 100 })
      .then((res) => {
        if (cancelled) return;
        setAssets(res.data);
        setUploadAssetId((current) => current || res.data[0]?.id || "");
      })
      .catch(() => {
        if (!cancelled) setAssets([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId]);

  useEffect(() => {
    let cancelled = false;
    listDocuments({
      asset_id: assetFilter || undefined,
      category: category || undefined,
      search: search || undefined,
      limit: 100,
    })
      .then((res) => {
        if (cancelled) return;
        // When project selected, only show docs for that project's assets
        let data = res.data;
        if (selectedProjectId && assets.length > 0) {
          const ids = new Set(assets.map((a) => a.id));
          data = data.filter((d) => ids.has(d.asset_id));
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
  }, [category, search, assetFilter, reloadToken, selectedProjectId, assets]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setUploadError(null);
    if (!uploadAssetId || !uploadFile) {
      setUploadError("Select an asset and a file.");
      return;
    }
    setUploading(true);
    try {
      await uploadDocument({
        asset_id: uploadAssetId,
        file: uploadFile,
        name: uploadName || undefined,
        category: uploadCategory,
      });
      setUploadFile(null);
      setUploadName("");
      setLoading(true);
      setReloadToken((n) => n + 1);
      toast.success("Document uploaded", uploadFile.name);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      setUploadError(message);
      toast.error("Upload failed", message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(doc: Document) {
    if (!window.confirm(`Delete “${doc.name}”?`)) return;
    try {
      await deleteDocument(doc.id);
      setLoading(true);
      setReloadToken((n) => n + 1);
      toast.success("Document deleted", doc.name);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed.";
      setError(message);
      toast.error("Delete failed", message);
    }
  }

  if (!selectedProjectId) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-[var(--ops-text-secondary)]">
        Select a project to manage documents.
      </div>
    );
  }

  const field =
    "mt-1 w-full rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-bg)] px-2.5 py-1.5 text-sm";

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-auto p-3 lg:p-4">
      <div>
        <h1 className="text-lg font-semibold text-[var(--ops-text)]">
          Documents
        </h1>
        <p className="text-xs text-[var(--ops-text-muted)]">
          Upload, preview, and organize files attached to assets
        </p>
      </div>

      {demoMode ? (
        <p className="rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-surface)] px-3 py-2 text-sm text-[var(--ops-text-secondary)]">
          Demo Mode is read-only — document uploads and deletes are disabled.
        </p>
      ) : null}

      {/* Upload */}
      {!demoMode ? (
      <form
        onSubmit={(e) => void handleUpload(e)}
        className="grid gap-3 rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-surface)] p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <label className="text-xs text-[var(--ops-text-muted)]">
          Asset *
          <select
            className={field}
            value={uploadAssetId}
            onChange={(e) => setUploadAssetId(e.target.value)}
            required
          >
            <option value="">Select…</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code ? `${a.code} · ` : ""}
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-[var(--ops-text-muted)]">
          Category
          <select
            className={field}
            value={uploadCategory}
            onChange={(e) =>
              setUploadCategory(e.target.value as DocumentCategory)
            }
          >
            {DOCUMENT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-[var(--ops-text-muted)]">
          Display name
          <input
            className={field}
            value={uploadName}
            onChange={(e) => setUploadName(e.target.value)}
            placeholder="Optional"
          />
        </label>
        <label className="text-xs text-[var(--ops-text-muted)]">
          File * (PDF, images)
          <input
            type="file"
            className={`${field} file:mr-2 file:rounded file:border-0 file:bg-[var(--ops-accent-muted)] file:px-2 file:py-1 file:text-xs file:text-[var(--ops-accent-hover)]`}
            accept=".pdf,image/*,.txt,application/pdf"
            onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            required
          />
        </label>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
          <Button type="submit" variant="primary" size="sm" disabled={uploading}>
            {uploading ? "Uploading…" : "Upload document"}
          </Button>
          {uploadError ? (
            <span className="text-sm text-[var(--ops-danger)]">{uploadError}</span>
          ) : null}
        </div>
      </form>
      ) : null}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <label className="relative">
          <Icon
            name="search"
            size={14}
            className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[var(--ops-text-muted)]"
          />
          <input
            className="h-9 w-52 rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-surface)] py-2 pr-3 pl-8 text-sm"
            placeholder="Search documents…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setLoading(true);
              setReloadToken((n) => n + 1);
            }}
          />
        </label>
        <select
          className="h-9 rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-surface)] px-2 text-sm"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setLoading(true);
            setReloadToken((n) => n + 1);
          }}
        >
          <option value="">All categories</option>
          {DOCUMENT_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-surface)] px-2 text-sm"
          value={assetFilter}
          onChange={(e) => {
            setAssetFilter(e.target.value);
            setLoading(true);
            setReloadToken((n) => n + 1);
          }}
        >
          <option value="">All assets</option>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-surface)]">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : null}

        {!loading && error ? (
          <ErrorState
            message={error}
            onRetry={() => {
              setLoading(true);
              setReloadToken((n) => n + 1);
            }}
          />
        ) : null}

        {!loading && !error && docs.length === 0 ? (
          <EmptyState
            title="NO DOCUMENTS"
            description="Upload a PDF or image to attach documentation to an asset."
          />
        ) : null}

        {!loading && !error && docs.length > 0 ? (
          <table className="w-full min-w-[800px] border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-[var(--ops-bg-elevated)] text-[11px] tracking-wide text-[var(--ops-text-muted)] uppercase">
              <tr className="border-b border-[var(--ops-border)]">
                <th className="px-3 py-2.5 font-medium">Name</th>
                <th className="px-3 py-2.5 font-medium">Asset</th>
                <th className="px-3 py-2.5 font-medium">Category</th>
                <th className="px-3 py-2.5 font-medium">Type</th>
                <th className="px-3 py-2.5 font-medium">Size</th>
                <th className="px-3 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr
                  key={doc.id}
                  className="border-b border-[var(--ops-border-subtle)] hover:bg-[var(--ops-surface-hover)]"
                >
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-[var(--ops-text)]">
                      {doc.name}
                    </p>
                    <p className="font-mono text-[10px] text-[var(--ops-text-muted)]">
                      {doc.filename}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 text-[var(--ops-text-secondary)]">
                    {assetNameById.get(doc.asset_id) ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 capitalize text-[var(--ops-text-secondary)]">
                    {doc.category}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-[var(--ops-text-muted)]">
                    {doc.mime_type ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--ops-text-secondary)]">
                    {formatBytes(doc.size_bytes)}
                  </td>
                  <td className="px-3 py-2.5">
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
                      {!demoMode ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleDelete(doc)}
                        >
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>

      {preview ? (
        <DocumentPreviewModal
          document={preview}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </div>
  );
}
