"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { AssetDocuments } from "@/features/assets/AssetDocuments";
import { AssetMedia } from "@/features/assets/AssetMedia";
import { COVER_DOCUMENT_META_KEY } from "@/types/domain";
import { statusColor } from "@/lib/status-colors";
import { useShell } from "@/stores/shell-context";
import { useUser } from "@/stores/user-context";
import type { Asset, AssetStatus, AssetType } from "@/types/domain";

type InfoPanelProps = {
  assets: Asset[];
  statuses: AssetStatus[];
  types: AssetType[];
  onEdit?: (asset: Asset) => void;
  onDelete?: (asset: Asset) => void;
};

function metaNumber(
  asset: Asset,
  keys: string[],
): number | string | undefined {
  for (const k of keys) {
    const val = asset.metadata[k];
    if (typeof val === "number") return val;
    if (typeof val === "string" && val.trim() !== "") return val;
  }
  return undefined;
}

export function InfoPanel({
  assets,
  statuses,
  types,
  onEdit,
  onDelete,
}: InfoPanelProps) {
  const user = useUser();
  const role = user?.role;
  const canEdit = role === "admin" || role === "manager" || role === "operator";
  const canDelete = role === "admin" || role === "manager";

  const {
    infoPanelOpen,
    setInfoPanelOpen,
    selectedAssetId,
    setSelectedAssetId,
    demoMode,
  } = useShell();

  const prevAssetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      selectedAssetId &&
      selectedAssetId !== prevAssetIdRef.current &&
      !infoPanelOpen
    ) {
      setInfoPanelOpen(true);
    }
    prevAssetIdRef.current = selectedAssetId;
  }, [selectedAssetId, infoPanelOpen, setInfoPanelOpen]);

  if (!infoPanelOpen) return null;

  const asset =
    assets.find((a) => a.id === selectedAssetId) ?? null;

  const type = asset
    ? types.find((t) => t.id === asset.asset_type_id)
    : undefined;
  const status = asset
    ? statuses.find((s) => s.id === asset.asset_status_id)
    : undefined;

  return (
    <aside
      className="flex w-full shrink-0 flex-col border-l border-[var(--ops-border-subtle)] bg-[var(--ops-surface)] lg:w-[var(--ops-info-panel-width)] shadow-[-8px_0_24px_rgba(0,0,0,0.03)] z-10"
      aria-label="Property details"
    >
      <div className="flex h-[72px] items-center justify-between border-b border-[var(--ops-border-subtle)] px-6">
        <h2 className="text-[20px] font-bold text-[var(--ops-text)]">
          Property Details
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full bg-[var(--ops-surface-hover)]"
          onClick={() => setInfoPanelOpen(false)}
          aria-label="Collapse panel"
        >
          <Icon name="x" size={18} />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6 bg-[var(--ops-bg)]">
        {!asset ? (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-70">
            <Icon name="home" size={48} className="text-[var(--ops-text-muted)] mb-4" />
            <p className="text-[15px] font-medium text-[var(--ops-text-secondary)]">
              Select a property on the map or list to inspect details.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {typeof asset.metadata[COVER_DOCUMENT_META_KEY] === "string" ? (
              <div className="overflow-hidden rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] bg-[var(--ops-surface)] shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/documents/${asset.metadata[COVER_DOCUMENT_META_KEY] as string}/thumbnail`}
                  alt=""
                  className="aspect-[16/10] w-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            ) : null}
            <div>
              <p className="font-mono text-[12px] font-semibold tracking-wider text-[var(--ops-text-muted)] uppercase mb-1">
                {asset.code ?? "—"}
              </p>
              <h2 className="text-2xl font-bold text-[var(--ops-text)] tracking-tight">
                {asset.name}
              </h2>
            </div>

            <div className="bg-[var(--ops-surface)] border border-[var(--ops-border-subtle)] rounded-[var(--ops-radius-xl)] p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[14px] text-[var(--ops-text-secondary)]">Type</dt>
                <dd className="text-[14px] font-semibold text-[var(--ops-text)]">
                  {type?.name ?? "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[14px] text-[var(--ops-text-secondary)]">Status</dt>
                <dd className="flex items-center gap-2 text-[14px] font-semibold text-[var(--ops-text)] bg-[var(--ops-surface-hover)] px-2.5 py-1 rounded-full">
                  {status ? (
                    <>
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: statusColor(
                            status.slug,
                            status.color,
                          ),
                        }}
                      />
                      {status.name}
                    </>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[14px] text-[var(--ops-text-secondary)]">Owner</dt>
                <dd className="text-[14px] font-semibold text-[var(--ops-text)]">
                  {asset.owner ?? "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[14px] text-[var(--ops-text-secondary)]">Capacity</dt>
                <dd className="text-[15px] font-semibold text-[var(--ops-text)]">
                  {metaNumber(asset, ["capacity", "pax"]) ?? "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[14px] text-[var(--ops-text-secondary)]">Placed</dt>
                <dd className="text-[15px] font-semibold text-[var(--ops-text)]">
                  {metaNumber(asset, ["placed"]) ?? "—"}
                </dd>
              </div>
              {asset.assignees.length > 0 ? (
                <div className="pt-2">
                  <dt className="mb-2 text-[13px] font-medium text-[var(--ops-text-secondary)]">Assigned</dt>
                  <dd className="flex flex-wrap gap-2">
                    {asset.assignees.map((person) => (
                      <span
                        key={person}
                        className="rounded-full bg-[var(--ops-accent-muted)] px-3 py-1 text-[13px] font-semibold text-[var(--ops-accent-hover)]"
                      >
                        {person}
                      </span>
                    ))}
                  </dd>
                </div>
              ) : null}
            </div>

            {asset.notes ? (
              <div className="bg-[var(--ops-surface)] border border-[var(--ops-border-subtle)] rounded-[var(--ops-radius-xl)] p-5 shadow-sm">
                <p className="mb-2 text-[12px] font-bold tracking-wider text-[var(--ops-text-muted)] uppercase">
                  Notes
                </p>
                <p className="whitespace-pre-wrap text-[14px] text-[var(--ops-text)] leading-relaxed">
                  {asset.notes}
                </p>
              </div>
            ) : null}

            {demoMode ? (
              <div className="bg-[var(--ops-warning-muted)] border border-[var(--ops-warning)]/20 rounded-[var(--ops-radius-lg)] p-3 flex gap-2 text-[var(--ops-warning)] text-[13px] font-medium">
                <Icon name="info" size={16} className="shrink-0 mt-0.5" />
                <p>Demo Mode is read-only. Turn Demo Mode off to edit real data.</p>
              </div>
            ) : null}

            <div className="bg-[var(--ops-surface)] border border-[var(--ops-border-subtle)] rounded-[var(--ops-radius-xl)] p-5 shadow-sm">
              <AssetMedia asset={asset} compact />
            </div>

            <div className="bg-[var(--ops-surface)] border border-[var(--ops-border-subtle)] rounded-[var(--ops-radius-xl)] p-5 shadow-sm">
              <AssetDocuments assetId={asset.id} mode="documents" />
            </div>

            <div className="flex flex-col gap-3 mt-4">
              <Link
                href={`/dashboard/properties/${asset.id}`}
                className="block"
                onClick={() => setInfoPanelOpen(false)}
              >
                <Button variant="primary" size="lg" className="w-full rounded-full shadow-sm">
                  View full details
                  <Icon name="external" size={16} />
                </Button>
              </Link>
              
              {(onEdit || onDelete) && !demoMode ? (
                <div className="flex gap-3">
                  {onEdit && canEdit ? (
                    <Button
                      variant="secondary"
                      size="lg"
                      className="flex-1 rounded-full bg-white shadow-sm"
                      onClick={() => onEdit(asset)}
                    >
                      <Icon name="edit" size={16} />
                      Edit
                    </Button>
                  ) : null}
                  {onDelete && canDelete ? (
                    <Button
                      variant="danger"
                      size="lg"
                      className="flex-1 rounded-full shadow-sm"
                      onClick={() => onDelete(asset)}
                    >
                      <Icon name="trash" size={16} />
                      Delete
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {assets.length > 1 ? (
              <div className="pt-4 border-t border-[var(--ops-border-subtle)]">
                <p className="mb-3 text-[12px] font-bold tracking-wider text-[var(--ops-text-muted)] uppercase px-2">
                  Other Properties in View
                </p>
                <ul className="max-h-[300px] space-y-1.5 overflow-y-auto p-1 pr-2">
                  {assets.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedAssetId(item.id)}
                        className={
                          item.id === asset.id
                            ? "w-full rounded-[var(--ops-radius-lg)] bg-[var(--ops-accent-muted)] px-3 py-2.5 text-left text-[14px] font-bold text-[var(--ops-accent-hover)] transition-colors"
                            : "w-full rounded-[var(--ops-radius-lg)] px-3 py-2.5 text-left text-[14px] font-medium text-[var(--ops-text-secondary)] hover:bg-[var(--ops-surface-hover)] hover:text-[var(--ops-text)] transition-colors"
                        }
                      >
                        {item.code ? <span className="opacity-70 mr-1.5">{item.code}</span> : null}
                        {item.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </aside>
  );
}
