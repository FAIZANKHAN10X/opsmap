"use client";

import Link from "next/link";

import { AssetDocuments } from "@/features/assets/AssetDocuments";
import { AssetMedia } from "@/features/assets/AssetMedia";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { statusColor } from "@/lib/status-colors";
import { COVER_DOCUMENT_META_KEY, type Asset, type AssetStatus, type AssetType } from "@/types/domain";
import { useShell } from "@/stores/shell-context";
import { usePermissions } from "@/stores/user-context";

type InfoPanelProps = {
  assets: Asset[];
  statuses: AssetStatus[];
  types: AssetType[];
  /** Opens the edit form for the selected asset. */
  onEdit?: (asset: Asset) => void;
  /** Deletes the selected asset (caller handles confirmation). */
  onDelete?: (asset: Asset) => void;
};

function metaNumber(asset: Asset, keys: string[]): number | null {
  for (const key of keys) {
    const value = asset.metadata[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

export function InfoPanel({
  assets,
  statuses,
  types,
  onEdit,
  onDelete,
}: InfoPanelProps) {
  const {
    infoPanelOpen,
    setInfoPanelOpen,
    selectedAssetId,
    setSelectedAssetId,
    demoMode,
  } = useShell();
  const { canEdit, canDelete } = usePermissions();

  if (!infoPanelOpen) return null;

  const asset =
    assets.find((a) => a.id === selectedAssetId) ?? assets[0] ?? null;
  const type = asset
    ? types.find((t) => t.id === asset.asset_type_id)
    : undefined;
  const status = asset
    ? statuses.find((s) => s.id === asset.asset_status_id)
    : undefined;

  return (
    <aside
      className="flex w-full shrink-0 flex-col border-l border-[var(--ops-border)] bg-[var(--ops-bg-elevated)] lg:w-[var(--ops-info-panel-width)]"
      aria-label="Property details"
    >
      <div className="flex h-12 items-center justify-between border-b border-[var(--ops-border)] px-3">
        <p className="text-xs font-semibold tracking-wide text-[var(--ops-text-muted)] uppercase">
          Property
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setInfoPanelOpen(false)}
          aria-label="Collapse panel"
        >
          <Icon name="x" size={16} />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {!asset ? (
          <p className="text-sm text-[var(--ops-text-secondary)]">
            Select a property on the map or list to inspect details.
          </p>
        ) : (
          <div className="space-y-4">
            {typeof asset.metadata[COVER_DOCUMENT_META_KEY] === "string" ? (
              <div className="overflow-hidden rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-bg)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/documents/${asset.metadata[COVER_DOCUMENT_META_KEY] as string}/thumbnail`}
                  alt=""
                  className="aspect-[16/10] w-full object-cover"
                />
              </div>
            ) : null}
            <div>
              <p className="font-mono text-[10px] tracking-wider text-[var(--ops-text-muted)] uppercase">
                {asset.code ?? "—"}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--ops-text)]">
                {asset.name}
              </h2>
            </div>

            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--ops-text-muted)]">Type</dt>
                <dd className="font-medium text-[var(--ops-text)]">
                  {type?.name ?? "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--ops-text-muted)]">Status</dt>
                <dd className="flex items-center gap-1.5 font-medium text-[var(--ops-text)]">
                  {status ? (
                    <>
                      <span
                        className="h-2 w-2 rounded-full"
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
                <dt className="text-[var(--ops-text-muted)]">Owner</dt>
                <dd className="font-medium text-[var(--ops-text)]">
                  {asset.owner ?? "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--ops-text-muted)]">Capacity</dt>
                <dd className="font-mono font-medium text-[var(--ops-text)]">
                  {metaNumber(asset, ["capacity", "pax"]) ?? "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--ops-text-muted)]">Placed</dt>
                <dd className="font-mono font-medium text-[var(--ops-text)]">
                  {metaNumber(asset, ["placed"]) ?? "—"}
                </dd>
              </div>
              {asset.assignees.length > 0 ? (
                <div>
                  <dt className="mb-1 text-[var(--ops-text-muted)]">Assigned</dt>
                  <dd className="flex flex-wrap gap-1">
                    {asset.assignees.map((person) => (
                      <span
                        key={person}
                        className="rounded-full border border-[var(--ops-border)] px-2 py-0.5 text-xs text-[var(--ops-text-secondary)]"
                      >
                        {person}
                      </span>
                    ))}
                  </dd>
                </div>
              ) : null}
            </dl>

            {asset.notes ? (
              <div>
                <p className="mb-1 text-[10px] font-semibold tracking-wider text-[var(--ops-text-muted)] uppercase">
                  Notes
                </p>
                <p className="whitespace-pre-wrap text-sm text-[var(--ops-text-secondary)]">
                  {asset.notes}
                </p>
              </div>
            ) : null}

            {demoMode ? (
              <p className="text-xs text-[var(--ops-text-muted)]">
                Demo Mode is read-only. Turn Demo Mode off to edit real data.
              </p>
            ) : null}

            <div className="border-t border-[var(--ops-border)] pt-4">
              <AssetMedia asset={asset} compact />
            </div>

            <div className="border-t border-[var(--ops-border)] pt-4">
              <AssetDocuments assetId={asset.id} mode="documents" />
            </div>

            {(onEdit || onDelete) && !demoMode ? (
              <div className="flex gap-2">
                {onEdit && canEdit ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => onEdit(asset)}
                  >
                    Edit property
                  </Button>
                ) : null}
                {onDelete && canDelete ? (
                  <Button
                    variant="danger"
                    size="sm"
                    className="flex-1"
                    onClick={() => onDelete(asset)}
                  >
                    Delete
                  </Button>
                ) : null}
              </div>
            ) : null}

            <Link
              href={`/dashboard/properties/${asset.id}`}
              className="block"
              onClick={() => setInfoPanelOpen(false)}
            >
              <Button variant="primary" size="sm" className="w-full">
                View full details
                <Icon name="external" size={14} />
              </Button>
            </Link>

            {assets.length > 1 ? (
              <div>
                <p className="mb-2 text-[10px] font-semibold tracking-wider text-[var(--ops-text-muted)] uppercase">
                  In view
                </p>
                <ul className="max-h-48 space-y-1 overflow-y-auto">
                  {assets.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedAssetId(item.id)}
                        className={
                          item.id === asset.id
                            ? "w-full rounded-[var(--ops-radius-sm)] bg-[var(--ops-accent-muted)] px-2 py-1.5 text-left text-xs font-medium text-[var(--ops-accent-hover)]"
                            : "w-full rounded-[var(--ops-radius-sm)] px-2 py-1.5 text-left text-xs text-[var(--ops-text-secondary)] hover:bg-[var(--ops-surface-hover)]"
                        }
                      >
                        {item.code ? `${item.code} · ` : ""}
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
