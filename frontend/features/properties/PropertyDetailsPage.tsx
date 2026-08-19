"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { AssetDocuments } from "@/features/assets/AssetDocuments";
import { AssetForm } from "@/features/assets/AssetForm";
import { AssetMedia } from "@/features/assets/AssetMedia";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingBlock } from "@/components/feedback/LoadingBlock";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import {
  HUB_LEGEND_COLORS,
  legendConceptForStatus,
} from "@/lib/hub-status";
import { deleteAsset, getAsset, updateAsset } from "@/services/assets";
import { listAssetStatuses } from "@/services/dashboard";
import { listAssetTypes } from "@/services/asset-types";
import { useShell } from "@/stores/shell-context";
import { usePermissions } from "@/stores/user-context";
import { useToast } from "@/stores/toast-context";
import type {
  Asset,
  AssetCreateInput,
  AssetStatus,
  AssetType,
  AssetUpdateInput,
} from "@/types/domain";

type PropertyDetailsPageProps = {
  assetId: string;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; asset: Asset };

function metaText(asset: Asset, key: string): string | null {
  const value = asset.metadata[key];
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

/**
 * Property management workspace — identity, location, configuration, media,
 * and documents, with edit/delete for authorized owners.
 */
export function PropertyDetailsPage({ assetId }: PropertyDetailsPageProps) {
  const router = useRouter();
  const { demoMode, refreshKey, bumpRefresh } = useShell();
  const { canEdit, canDelete } = usePermissions();
  const toast = useToast();
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [statuses, setStatuses] = useState<AssetStatus[]>([]);
  const [types, setTypes] = useState<AssetType[]>([]);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getAsset(assetId, demoMode), listAssetStatuses(), listAssetTypes()])
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
  }, [assetId, demoMode, refreshKey]);

  async function handleSave(payload: AssetCreateInput | AssetUpdateInput) {
    await updateAsset(assetId, payload as AssetUpdateInput);
    setEditing(false);
    toast.success("Property updated");
    bumpRefresh();
  }

  async function handleDelete(asset: Asset) {
    if (!window.confirm(`Delete "${asset.name}"? This removes it from the map and list.`)) {
      return;
    }
    try {
      await deleteAsset(asset.id);
      toast.success("Property deleted");
      bumpRefresh();
      router.push("/dashboard/development");
    } catch (err) {
      toast.error(
        "Could not delete property",
        err instanceof Error ? err.message : undefined,
      );
    }
  }

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
  const canMutate = !demoMode;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-4 p-4 lg:p-6">
        <div>
          <Link
            href="/dashboard/development"
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--ops-text-muted)] hover:text-[var(--ops-text)]"
          >
            <Icon name="chevron-left" size={14} />
            Back to properties
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

          {canMutate && (canEdit || canDelete) && !editing ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {canEdit ? (
                <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                  Edit property
                </Button>
              ) : null}
              {canDelete ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => void handleDelete(asset)}
                >
                  Delete
                </Button>
              ) : null}
            </div>
          ) : null}

          {demoMode ? (
            <p className="mt-3 text-xs text-[var(--ops-text-muted)]">
              Demo Mode is read-only.
            </p>
          ) : null}

          {editing ? (
            <div className="mt-5 border-t border-[var(--ops-border)] pt-4">
              <AssetForm
                mode="edit"
                projectId={asset.project_id}
                initial={asset}
                types={types}
                statuses={statuses}
                onSubmit={handleSave}
                onCancel={() => setEditing(false)}
              />
            </div>
          ) : (
            <>
              <Section title="Identity">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                  <Field label="Type" value={type?.name ?? "—"} />
                  <Field label="Status" value={status?.name ?? "—"} />
                  <Field label="Address" value={metaText(asset, "address") ?? "—"} />
                  <Field
                    label="On the plan"
                    value={
                      metaText(asset, "map_x") && metaText(asset, "map_y")
                        ? "Placed"
                        : "Not placed on plan"
                    }
                  />
                </dl>
                {asset.description ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--ops-text-secondary)]">
                    {asset.description}
                  </p>
                ) : null}
              </Section>

              <Section title="Characteristics">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                  <Field label="Bedrooms" value={metaText(asset, "bedrooms") ?? "—"} />
                  <Field label="Bathrooms" value={metaText(asset, "bathrooms") ?? "—"} />
                  <Field
                    label="Area"
                    value={metaText(asset, "area_sqm") ? `${metaText(asset, "area_sqm")} sqm` : "—"}
                  />
                  <Field label="Floor" value={metaText(asset, "floor") ?? "—"} />
                </dl>
              </Section>

              <Section title="Operations">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                  <Field label="Owner" value={asset.owner ?? "—"} />
                  <Field label="Capacity" value={metaText(asset, "capacity") ?? metaText(asset, "pax") ?? "—"} />
                  <Field label="Placed" value={metaText(asset, "placed") ?? "—"} />
                  {asset.assignees.length > 0 ? (
                    <div className="sm:col-span-3">
                      <dt className="text-[var(--ops-text-muted)]">Assignees</dt>
                      <dd className="mt-0.5 font-medium text-[var(--ops-text)]">
                        {asset.assignees.join(", ")}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </Section>

              {asset.notes ? (
                <Section title="Notes">
                  <p className="whitespace-pre-wrap text-sm text-[var(--ops-text-secondary)]">
                    {asset.notes}
                  </p>
                </Section>
              ) : null}

              <div className="mt-4 border-t border-[var(--ops-border)] pt-4">
                <AssetMedia asset={asset} />
              </div>

              <div className="mt-4 border-t border-[var(--ops-border)] pt-4">
                <AssetDocuments assetId={asset.id} mode="documents" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-4 border-t border-[var(--ops-border)] pt-4">
      <p className="mb-3 text-[10px] font-semibold tracking-wider text-[var(--ops-text-muted)] uppercase">
        {title}
      </p>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[var(--ops-text-muted)]">{label}</dt>
      <dd className="mt-0.5 font-medium text-[var(--ops-text)]">{value}</dd>
    </div>
  );
}
