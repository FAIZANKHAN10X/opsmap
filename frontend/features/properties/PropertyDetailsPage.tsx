"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AssetDocuments } from "@/features/assets/AssetDocuments";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingBlock } from "@/components/feedback/LoadingBlock";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import {
  HUB_LEGEND_COLORS,
  legendConceptForStatus,
} from "@/lib/hub-status";
import { getAsset } from "@/services/assets";
import { listAssetStatuses } from "@/services/dashboard";
import { listAssetTypes } from "@/services/asset-types";
import type { Asset, AssetStatus, AssetType } from "@/types/domain";

type PropertyDetailsPageProps = {
  assetId: string;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; asset: Asset };

/**
 * Full property/villa details page (Phase 11) — reached from the property
 * card's "View full details" link. Read-only overview plus documents.
 */
export function PropertyDetailsPage({ assetId }: PropertyDetailsPageProps) {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [statuses, setStatuses] = useState<AssetStatus[]>([]);
  const [types, setTypes] = useState<AssetType[]>([]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getAsset(assetId), listAssetStatuses(), listAssetTypes()])
      .then(([assetRes, statusRes, typeRes]) => {
        if (cancelled) return;
        setStatuses(statusRes.data);
        setTypes(typeRes.data);
        setLoadState({ status: "ready", asset: assetRes.data });
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setLoadState({
            status: "error",
            message: err.message || "Failed to load property.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [assetId]);

  if (loadState.status === "loading") {
    return <LoadingBlock rows={6} />;
  }

  if (loadState.status === "error") {
    return (
      <div className="p-4">
        <ErrorState message={loadState.message} />
      </div>
    );
  }

  const asset = loadState.asset;
  const status = asset.asset_status_id
    ? statuses.find((s) => s.id === asset.asset_status_id)
    : undefined;
  const type = asset.asset_type_id
    ? types.find((t) => t.id === asset.asset_type_id)
    : undefined;
  const concept = legendConceptForStatus(status?.slug);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-4 p-4 lg:p-6">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--ops-text-muted)] hover:text-[var(--ops-text)]"
          >
            <Icon name="chevron-left" size={14} />
            Back to 8AM HUB
          </Link>
        </div>

        <div className="rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-surface)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] tracking-wider text-[var(--ops-text-muted)] uppercase">
                {asset.code ?? "PROPERTY"}
              </p>
              <h1 className="mt-1 text-xl font-semibold text-[var(--ops-text)]">
                {asset.name}
              </h1>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ops-border)] px-2.5 py-1 text-xs font-medium text-[var(--ops-text-secondary)]">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: HUB_LEGEND_COLORS[concept] }}
              />
              {concept}
            </span>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-[var(--ops-border)] pt-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-[var(--ops-text-muted)]">Type</dt>
              <dd className="mt-0.5 font-medium text-[var(--ops-text)]">
                {type?.name ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--ops-text-muted)]">Status</dt>
              <dd className="mt-0.5 font-medium text-[var(--ops-text)]">
                {status?.name ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--ops-text-muted)]">Owner</dt>
              <dd className="mt-0.5 font-medium text-[var(--ops-text)]">
                {asset.owner ?? "—"}
              </dd>
            </div>
            {asset.assignees.length > 0 ? (
              <div>
                <dt className="text-[var(--ops-text-muted)]">Assigned</dt>
                <dd className="mt-0.5 font-medium text-[var(--ops-text)]">
                  {asset.assignees.join(", ")}
                </dd>
              </div>
            ) : null}
          </dl>

          {Object.keys(asset.metadata).length > 0 ? (
            <div className="mt-4 border-t border-[var(--ops-border)] pt-4">
              <p className="mb-2 text-[10px] font-semibold tracking-wider text-[var(--ops-text-muted)] uppercase">
                Property data
              </p>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                {Object.entries(asset.metadata).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-[var(--ops-text-muted)]">{key}</dt>
                    <dd className="mt-0.5 font-mono text-[var(--ops-text)]">
                      {String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          {asset.description ? (
            <div className="mt-4 border-t border-[var(--ops-border)] pt-4">
              <p className="mb-1 text-[10px] font-semibold tracking-wider text-[var(--ops-text-muted)] uppercase">
                Description
              </p>
              <p className="whitespace-pre-wrap text-sm text-[var(--ops-text-secondary)]">
                {asset.description}
              </p>
            </div>
          ) : null}

          {asset.notes ? (
            <div className="mt-4 border-t border-[var(--ops-border)] pt-4">
              <p className="mb-1 text-[10px] font-semibold tracking-wider text-[var(--ops-text-muted)] uppercase">
                Notes
              </p>
              <p className="whitespace-pre-wrap text-sm text-[var(--ops-text-secondary)]">
                {asset.notes}
              </p>
            </div>
          ) : null}

          <div className="mt-4 border-t border-[var(--ops-border)] pt-4">
            <AssetDocuments assetId={asset.id} />
          </div>
        </div>

        <div className="flex justify-end">
          <Link href="/dashboard">
            <Button variant="secondary" size="sm">
              <Icon name="chevron-left" size={14} />
              Back to 8AM HUB
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}