"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  createDocument,
  deleteDocument,
  listAssetDocuments,
} from "@/services/documents";
import type { Document } from "@/types/domain";

type AssetDocumentsProps = {
  assetId: string;
};

export function AssetDocuments({ assetId }: AssetDocumentsProps) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [filename, setFilename] = useState("");
  const [saving, setSaving] = useState(false);

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
  }, [assetId]);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !filename.trim()) return;
    setSaving(true);
    try {
      await createDocument({
        asset_id: assetId,
        name: name.trim(),
        filename: filename.trim(),
        mime_type: filename.endsWith(".pdf")
          ? "application/pdf"
          : "application/octet-stream",
      });
      setName("");
      setFilename("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add document.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDocument(id);
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
          No documents attached.
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
              </p>
              <p className="truncate font-mono text-[10px] text-[var(--ops-text-muted)]">
                {doc.filename}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={`Delete ${doc.name}`}
              onClick={() => void handleDelete(doc.id)}
            >
              <Icon name="x" size={14} />
            </Button>
          </li>
        ))}
      </ul>

      <form
        onSubmit={(e) => void handleAdd(e)}
        className="space-y-2 rounded-[var(--ops-radius)] border border-dashed border-[var(--ops-border)] p-3"
      >
        <p className="text-[10px] font-medium text-[var(--ops-text-muted)] uppercase">
          Add document metadata
        </p>
        <input
          className="w-full rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-bg)] px-2.5 py-1.5 text-sm"
          placeholder="Display name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="w-full rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-bg)] px-2.5 py-1.5 text-sm"
          placeholder="filename.pdf"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
        />
        <Button type="submit" size="sm" variant="secondary" disabled={saving}>
          {saving ? "Adding…" : "Attach document"}
        </Button>
        <p className="text-[10px] text-[var(--ops-text-muted)]">
          Metadata only — binary upload arrives in the documents phase.
        </p>
      </form>

      {error ? (
        <p className="text-sm text-[var(--ops-danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
