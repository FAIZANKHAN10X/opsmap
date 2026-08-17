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

type AssetDocumentsProps = {
  assetId: string;
};

export function AssetDocuments({ assetId }: AssetDocumentsProps) {
  const { demoMode } = useShell();
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
      const res = await listAssetDocuments(assetId);
      setDocs(res.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents.");
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    let cancelled = false;
    listAssetDocuments(assetId)
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
  }, [assetId, reloadToken]);

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

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold tracking-wider text-[var(--ops-text-muted)] uppercase">
        Documents
      </p>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </div>
      ) : null}

      {!loading && docs.length === 0 ? (
        <p className="text-sm text-[var(--ops-text-secondary)]">
          {demoMode
            ? "Demo mode is read-only — no documents are attached."
            : "No documents attached."}
        </p>
      ) : null}

      <ul className="space-y-1.5">
        {docs.map((doc) => (
          <li
            key={doc.id}
            className="flex items-center gap-2 rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-surface)] px-2.5 py-2"
          >
            <Icon name="file" size={14} className="text-[var(--ops-text-muted)]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--ops-text)]">
                {doc.name}
                {doc.has_thumbnail ? (
                  <span className="ml-1.5 rounded bg-[var(--ops-surface-hover)] px-1 py-0.5 text-[9px] font-medium tracking-wide text-[var(--ops-text-muted)] uppercase">
                    thumb
                  </span>
                ) : null}
              </p>
              <p className="truncate font-mono text-[10px] text-[var(--ops-text-muted)]">
                {doc.category} · {doc.filename}
              </p>
            </div>
            <div className="flex shrink-0 gap-0.5">
              {doc.is_previewable !== false ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={`Preview ${doc.name}`}
                  onClick={() => setPreview(doc)}
                >
                  <Icon name="layers" size={14} />
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label={`Download ${doc.name}`}
                onClick={() => downloadDocumentClient(doc)}
              >
                <Icon name="file" size={14} />
              </Button>
              {!demoMode ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
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

      {!demoMode ? (
        <form
          onSubmit={(e) => void handleUpload(e)}
          className="space-y-2 rounded-[var(--ops-radius)] border border-dashed border-[var(--ops-border)] p-3"
        >
          <p className="text-[10px] font-medium text-[var(--ops-text-muted)] uppercase">
            Upload file
          </p>
          <input
            className="w-full rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-bg)] px-2.5 py-1.5 text-sm"
            placeholder="Display name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            className="w-full rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-bg)] px-2.5 py-1.5 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value as DocumentCategory)}
          >
            {DOCUMENT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            type="file"
            accept=".pdf,image/*,.txt,application/pdf"
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
