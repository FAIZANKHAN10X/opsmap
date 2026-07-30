"use client";

import { useMemo, useEffect } from "react";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import {
  downloadDocumentClient,
  getDocumentObjectUrl,
} from "@/services/documents";
import type { Document } from "@/types/domain";

type DocumentPreviewModalProps = {
  document: Document;
  onClose: () => void;
};

export function DocumentPreviewModal({
  document: doc,
  onClose,
}: DocumentPreviewModalProps) {
  const url = useMemo(() => getDocumentObjectUrl(doc), [doc]);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  const isImage = doc.mime_type?.startsWith("image/");
  const isPdf = doc.mime_type === "application/pdf";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${doc.name}`}
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-bg-elevated)] shadow-[var(--ops-shadow)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-[var(--ops-border)] px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
              {doc.name}
            </p>
            <p className="truncate font-mono text-[10px] text-[var(--ops-text-muted)]">
              {doc.filename} · {doc.category}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => downloadDocumentClient(doc)}
          >
            Download
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
            aria-label="Close preview"
          >
            <Icon name="x" size={16} />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-[var(--ops-bg)] p-3">
          {isImage && url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={doc.name}
              className="mx-auto max-h-[70vh] max-w-full object-contain"
            />
          ) : null}
          {isPdf && url ? (
            <iframe
              title={doc.name}
              src={url}
              className="h-[70vh] w-full rounded border border-[var(--ops-border)] bg-white"
            />
          ) : null}
          {!isImage && !isPdf ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-sm text-[var(--ops-text-secondary)]">
              <Icon name="file" size={28} />
              <p>Preview not available for this file type.</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => downloadDocumentClient(doc)}
              >
                Download instead
              </Button>
            </div>
          ) : null}
          {(isImage || isPdf) && !url ? (
            <div className="flex h-48 items-center justify-center text-sm text-[var(--ops-text-secondary)]">
              No file bytes available for preview (metadata-only seed).
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
