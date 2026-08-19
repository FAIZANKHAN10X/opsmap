"use client";

import { AssetDocuments } from "@/features/assets/AssetDocuments";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { statusColor } from "@/lib/status-colors";
import { useShell } from "@/stores/shell-context";
import { usePermissions } from "@/stores/user-context";
import type { Asset, AssetStatus, AssetType } from "@/types/domain";

type AssetDetailPanelProps = {
  asset: Asset;
  type?: AssetType;
  status?: AssetStatus;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
};

export function AssetDetailPanel({
  asset,
  type,
  status,
  onEdit,
  onDelete,
  onClose,
}: AssetDetailPanelProps) {
  const { canEdit, canDelete } = usePermissions();
  const { demoMode } = useShell();
  const canMutate = !demoMode;

  return (
    <aside
      className="flex w-full shrink-0 flex-col border-l border-[var(--ops-border)] bg-[var(--ops-bg-elevated)] lg:w-[var(--ops-info-panel-width)]"
      aria-label="Asset details"
    >
      <div className="flex h-12 items-center justify-between border-b border-[var(--ops-border)] px-3">
        <p className="text-xs font-semibold tracking-wide text-[var(--ops-text-muted)] uppercase">
          Asset details
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClose}
          aria-label="Close details"
        >
          <Icon name="x" size={16} />
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        <div>
          <p className="font-mono text-[10px] tracking-wider text-[var(--ops-text-muted)] uppercase">
            {asset.code ?? "—"}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--ops-text)]">
            {asset.name}
          </h2>
        </div>

        <dl className="space-y-3 text-sm">
          <Row label="Type" value={type?.name ?? "—"} />
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[var(--ops-text-muted)]">Status</dt>
            <dd className="flex items-center gap-1.5 font-medium text-[var(--ops-text)]">
              {status ? (
                <>
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: statusColor(status.slug, status.color),
                    }}
                  />
                  {status.name}
                </>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <Row label="Owner" value={asset.owner ?? "—"} />
          <div>
            <dt className="mb-1 text-[var(--ops-text-muted)]">Assigned users</dt>
            <dd className="text-[var(--ops-text)]">
              {asset.assignees.length === 0 ? (
                <span className="text-[var(--ops-text-secondary)]">None</span>
              ) : (
                <ul className="flex flex-wrap gap-1.5">
                  {asset.assignees.map((person) => (
                    <li
                      key={person}
                      className="rounded-full border border-[var(--ops-border)] bg-[var(--ops-surface)] px-2 py-0.5 text-xs"
                    >
                      {person}
                    </li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
        </dl>

        {asset.description ? (
          <section>
            <p className="mb-1 text-[10px] font-semibold tracking-wider text-[var(--ops-text-muted)] uppercase">
              Description
            </p>
            <p className="text-sm text-[var(--ops-text-secondary)]">
              {asset.description}
            </p>
          </section>
        ) : null}

        {asset.notes ? (
          <section>
            <p className="mb-1 text-[10px] font-semibold tracking-wider text-[var(--ops-text-muted)] uppercase">
              Notes
            </p>
            <p className="whitespace-pre-wrap text-sm text-[var(--ops-text-secondary)]">
              {asset.notes}
            </p>
          </section>
        ) : null}

        <AssetDocuments assetId={asset.id} />

        <div className="flex gap-2 border-t border-[var(--ops-border)] pt-4">
          {canEdit && canMutate ? (
            <Button variant="secondary" size="sm" onClick={onEdit}>
              Edit
            </Button>
          ) : null}
          {canDelete && canMutate ? (
            <Button variant="danger" size="sm" onClick={onDelete}>
              Delete
            </Button>
          ) : null}
          {(!canEdit || !canMutate) && (!canDelete || !canMutate) ? (
            <p className="text-xs text-[var(--ops-text-muted)]">
              {demoMode ? "Demo Mode is read-only" : "View-only access"}
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[var(--ops-text-muted)]">{label}</dt>
      <dd className="font-medium text-[var(--ops-text)]">{value}</dd>
    </div>
  );
}
