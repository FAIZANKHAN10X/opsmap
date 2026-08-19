"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingBlock } from "@/components/feedback/LoadingBlock";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { AssetDocuments } from "@/features/assets/AssetDocuments";
import { AssetForm } from "@/features/assets/AssetForm";
import { AssetMedia } from "@/features/assets/AssetMedia";
import { HUB_LEGEND_COLORS, legendConceptForStatus } from "@/lib/hub-status";
import { deleteAsset, getAsset, updateAsset } from "@/services/assets";
import { listAssetTypes } from "@/services/asset-types";
import { listAssetStatuses } from "@/services/dashboard";
import { COVER_DOCUMENT_META_KEY } from "@/types/domain";
import { useShell } from "@/stores/shell-context";
import { useToast } from "@/stores/toast-context";
import { useUser } from "@/stores/user-context";
import type {
  Asset,
  AssetCreateInput,
  AssetStatus,
  AssetType,
  AssetUpdateInput,
} from "@/types/domain";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; asset: Asset };

function metaText(asset: Asset, key: string): string | null {
  const val = asset.metadata[key];
  if (typeof val === "string" && val.trim() !== "") return val.trim();
  if (typeof val === "number") return String(val);
  return null;
}

export function PropertyDetailsPage({ assetId }: { assetId: string }) {
  const router = useRouter();
  const { demoMode, refreshKey, bumpRefresh } = useShell();
  const toast = useToast();
  const user = useUser();

  const role = user?.role;
  const canEdit = role === "admin" || role === "manager" || role === "operator";
  const canDelete = role === "admin" || role === "manager";

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
      <div className="p-6">
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
  const coverDocumentId = asset.metadata[COVER_DOCUMENT_META_KEY];

  return (
    <div className="h-full overflow-y-auto bg-[var(--ops-bg)]">
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
        <div>
          <Link
            href="/dashboard/development"
            className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--ops-text-secondary)] hover:text-[var(--ops-text)] transition-colors"
          >
            <Icon name="chevron-left" size={16} />
            Back to properties
          </Link>
        </div>

        <div className="bg-white rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] shadow-[var(--ops-shadow-sm)] overflow-hidden">
          {typeof coverDocumentId === "string" ? (
            <div className="w-full h-[300px] bg-[var(--ops-surface-hover)] relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/documents/${coverDocumentId}/thumbnail`}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          ) : null}
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[12px] font-bold tracking-wider text-[var(--ops-text-muted)] uppercase mb-1">
                  {asset.code ?? "PROPERTY"}
                </p>
                <h1 className="text-3xl font-bold text-[var(--ops-text)] tracking-tight">
                  {asset.name}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold" style={{ backgroundColor: HUB_LEGEND_COLORS[concept] + '15', color: HUB_LEGEND_COLORS[concept] }}>
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: HUB_LEGEND_COLORS[concept] }}
                  />
                  {concept}
                </span>
              </div>
            </div>

            {canMutate && (canEdit || canDelete) && !editing ? (
              <div className="mt-6 flex flex-wrap gap-3">
                {canEdit ? (
                  <Button variant="secondary" size="md" onClick={() => setEditing(true)} className="rounded-full shadow-sm bg-white">
                    <Icon name="edit" size={16} />
                    Edit property
                  </Button>
                ) : null}
                {canDelete ? (
                  <Button
                    variant="danger"
                    size="md"
                    className="rounded-full shadow-sm"
                    onClick={() => void handleDelete(asset)}
                  >
                    <Icon name="trash" size={16} />
                    Delete
                  </Button>
                ) : null}
              </div>
            ) : null}

            {demoMode ? (
              <p className="mt-4 text-[13px] font-medium text-[var(--ops-warning)] bg-[var(--ops-warning-muted)] p-3 rounded-[var(--ops-radius-lg)] inline-flex gap-2">
                <Icon name="info" size={16} /> Demo Mode is read-only.
              </p>
            ) : null}
          </div>
        </div>

        {editing ? (
          <div className="bg-white rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] shadow-[var(--ops-shadow-sm)] p-6 md:p-8">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <Section title="Identity">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-[14px]">
                  <Field label="Type" value={type?.name ?? "—"} />
                  <Field label="Status" value={status?.name ?? "—"} />
                  <Field label="Address" value={metaText(asset, "address") ?? "—"} className="col-span-2" />
                  <Field
                    label="On the plan"
                    value={
                      metaText(asset, "map_x") && metaText(asset, "map_y")
                        ? "Placed"
                        : "Not placed on plan"
                    }
                    className="col-span-2"
                  />
                </dl>
                {asset.description ? (
                  <div className="mt-4 pt-4 border-t border-[var(--ops-border-subtle)]">
                    <dt className="text-[13px] text-[var(--ops-text-muted)] mb-1">Description</dt>
                    <dd className="whitespace-pre-wrap text-[14px] text-[var(--ops-text)] font-medium leading-relaxed">
                      {asset.description}
                    </dd>
                  </div>
                ) : null}
              </Section>

              <Section title="Operations">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-[14px]">
                  <Field label="Owner" value={asset.owner ?? "—"} />
                  <Field label="Capacity" value={metaText(asset, "capacity") ?? metaText(asset, "pax") ?? "—"} />
                  <Field label="Placed" value={metaText(asset, "placed") ?? "—"} />
                  {asset.assignees.length > 0 ? (
                    <div className="col-span-2 mt-2">
                      <dt className="text-[13px] text-[var(--ops-text-muted)] mb-2">Assignees</dt>
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
                </dl>
              </Section>
            </div>

            <div className="space-y-6">
              <Section title="Characteristics">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-[14px]">
                  <Field label="Bedrooms" value={metaText(asset, "bedrooms") ?? "—"} />
                  <Field label="Bathrooms" value={metaText(asset, "bathrooms") ?? "—"} />
                  <Field
                    label="Area"
                    value={metaText(asset, "area_sqm") ? `${metaText(asset, "area_sqm")} sqm` : "—"}
                  />
                  <Field label="Floor" value={metaText(asset, "floor") ?? "—"} />
                </dl>
              </Section>

              {asset.notes ? (
                <Section title="Notes">
                  <p className="whitespace-pre-wrap text-[14px] text-[var(--ops-text)] font-medium leading-relaxed">
                    {asset.notes}
                  </p>
                </Section>
              ) : null}
            </div>
            
            <div className="md:col-span-2 space-y-6">
              <Section title="Media">
                <AssetMedia asset={asset} />
              </Section>

              <Section title="Documents">
                <AssetDocuments assetId={asset.id} mode="documents" />
              </Section>
            </div>
          </div>
        )}
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
    <div className="bg-white rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] shadow-[var(--ops-shadow-sm)] p-6">
      <h3 className="mb-5 text-[16px] font-bold text-[var(--ops-text)]">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[13px] text-[var(--ops-text-secondary)]">{label}</dt>
      <dd className="mt-1 font-semibold text-[var(--ops-text)]">{value}</dd>
    </div>
  );
}
