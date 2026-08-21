"use client";

import { useCallback, useEffect, useState } from "react";

import { DocumentPreviewModal } from "@/features/documents/DocumentPreviewModal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  deleteDocument,
  downloadDocumentClient,
  listAssetDocuments,
  uploadDocument,
} from "@/services/documents";
import {
  DOCUMENT_CATEGORIES,
  type Document,
  type DocumentCategory,
} from "@/types/domain";
import { useShell } from "@/stores/shell-context";
import { usePermissions } from "@/stores/user-context";

type AssetDocumentsProps = {
  assetId: string;
  mode?: "all" | "documents";
};

export function AssetDocuments({
  assetId,
  mode = "all",
}: AssetDocumentsProps) {
  const { demoMode, refreshKey } = useShell();
  const { canEdit, canDelete } = usePermissions();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("other");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<Document | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(async () => {
    try {
      const res = await listAssetDocuments(assetId, undefined, demoMode);
      setDocs(res.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents.");
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [assetId, demoMode]);

  useEffect(() => {
    let cancelled = false;
    listAssetDocuments(assetId, undefined, demoMode)
      .then((res) => {
        if (cancelled) return;
        setDocs(res.data);
        setError(null);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || "Failed to load documents.");
        setDocs([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [assetId, demoMode, reloadToken, refreshKey]);

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;
    setSaving(true);
    try {
      await uploadDocument({
        asset_id: assetId,
        file,
        name: name.trim() || undefined,
        category,
      });
      setName("");
      setFile(null);
      setCategory("other");
      setLoading(true);
      setReloadToken((n) => n + 1);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDocument(id);
      setLoading(true);
      setReloadToken((n) => n + 1);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete document.");
    }
  }

  const visibleDocs =
    mode === "documents" ? docs.filter((doc) => doc.category !== "image") : docs;

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-14 w-full rounded-[var(--ops-radius-lg)]" />
          <Skeleton className="h-14 w-3/4 rounded-[var(--ops-radius-lg)]" />
        </div>
      ) : null}

      {!loading && visibleDocs.length === 0 ? (
        <div className="bg-[var(--ops-surface-hover)] border border-dashed border-[var(--ops-border-subtle)] rounded-[var(--ops-radius-lg)] p-6 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm text-[var(--ops-text-muted)]">
            <Icon name="file" size={20} />
          </div>
          <p className="text-[14px] font-semibold text-[var(--ops-text)]">
            No documents yet
          </p>
          <p className="text-[13px] text-[var(--ops-text-secondary)] mt-1">
            {demoMode
              ? "Demo Mode is read-only."
              : "Upload relevant files here."}
          </p>
        </div>
      ) : null}

      <ul className="space-y-2">
        {visibleDocs.map((doc) => (
          <li
            key={doc.id}
            className="flex items-center gap-3 rounded-[var(--ops-radius-lg)] border border-[var(--ops-border-subtle)] bg-white px-4 py-3 shadow-[var(--ops-shadow-sm)] hover:border-[var(--ops-border-strong)] transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-[var(--ops-surface-hover)] text-[var(--ops-text-secondary)] flex items-center justify-center shrink-0">
              <Icon name="file" size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-[var(--ops-text)]">
                {doc.name}
                {doc.has_thumbnail ? (
                  <span className="ml-2 rounded-full bg-[var(--ops-accent-muted)] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[var(--ops-accent-hover)] uppercase">
                    thumb
                  </span>
                ) : null}
              </p>
              <p className="truncate font-mono text-[11px] text-[var(--ops-text-muted)] mt-0.5 uppercase tracking-wide">
                {doc.category} · {doc.filename}
              </p>
            </div>
            <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!demoMode && doc.is_previewable !== false ? (
                <Button
                  variant="secondary"
                  size="icon-sm"
                  className="rounded-full shadow-sm"
                  aria-label={`Preview ${doc.name}`}
                  onClick={() => setPreview(doc)}
                >
                  <Icon name="layers" size={14} />
                </Button>
              ) : null}
              {!demoMode ? (
                <Button
                  variant="secondary"
                  size="icon-sm"
                  className="rounded-full shadow-sm"
                  aria-label={`Download ${doc.name}`}
                  onClick={() => downloadDocumentClient(doc)}
                >
                  <Icon name="file" size={14} />
                </Button>
              ) : null}
              {!demoMode && canDelete ? (
                <Button
                  variant="danger"
                  size="icon-sm"
                  className="rounded-full shadow-sm bg-white hover:bg-[var(--ops-danger-muted)] text-[var(--ops-danger)] border border-[var(--ops-danger)]/20"
                  aria-label={`Delete ${doc.name}`}
                  onClick={() => void handleDelete(doc.id)}
                >
                  <Icon name="x" size={14} />
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {!demoMode && canEdit ? (
        <form
          onSubmit={(e) => void handleUpload(e)}
          className="space-y-3 rounded-[var(--ops-radius-xl)] bg-[var(--ops-surface-hover)] border border-transparent p-5 mt-4"
        >
          <p className="text-[13px] font-bold text-[var(--ops-text)]">
            Upload new document
          </p>
          <input
            className="w-full rounded-[var(--ops-radius-lg)] border border-[var(--ops-border-subtle)] bg-white px-3.5 py-2.5 text-[14px] shadow-sm focus:border-[var(--ops-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ops-accent-muted)] transition-all"
            placeholder="Display name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            className="w-full rounded-[var(--ops-radius-lg)] border border-[var(--ops-border-subtle)] bg-white px-3.5 py-2.5 text-[14px] shadow-sm focus:border-[var(--ops-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ops-accent-muted)] transition-all"
            value={category}
            onChange={(e) => setCategory(e.target.value as DocumentCategory)}
          >
            {DOCUMENT_CATEGORIES.filter(
              (c) => mode === "all" || c.value !== "image",
            ).map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            type="file"
            accept={
              mode === "documents"
                ? ".pdf,.txt,application/pdf,text/plain"
                : ".pdf,image/*,.txt,application/pdf"
            }
            className="w-full text-[13px] text-[var(--ops-text-secondary)] py-1"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
          <div className="pt-2">
            <Button type="submit" size="md" variant="primary" disabled={saving || !file} className="rounded-full px-6 shadow-sm">
              {saving ? "Uploading…" : "Upload Document"}
            </Button>
          </div>
        </form>
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
