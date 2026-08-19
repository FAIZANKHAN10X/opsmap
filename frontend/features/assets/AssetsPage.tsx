"use client";

import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { AssetDetailPanel } from "@/features/assets/AssetDetailPanel";
import { AssetForm } from "@/features/assets/AssetForm";
import { cn } from "@/lib/cn";
import { statusColor } from "@/lib/status-colors";
import {
  createAsset,
  deleteAsset,
  listAssets,
  updateAsset,
} from "@/services/assets";
import { listAssetTypes } from "@/services/asset-types";
import { listAssetStatuses } from "@/services/dashboard";
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

export function AssetsPage() {
  const { selectedProjectId, demoMode, refreshKey, bumpRefresh } = useShell();
  const user = useUser();
  const toast = useToast();
  const role = user?.role;
  const canEdit = role === "admin" || role === "manager" || role === "operator";

  const [assets, setAssets] = useState<Asset[]>([]);
  const [statuses, setStatuses] = useState<AssetStatus[]>([]);
  const [types, setTypes] = useState<AssetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [reloadToken, setReloadToken] = useState(0);
  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    if (!selectedProjectId && !demoMode) return;
    let cancelled = false;

    async function load() {
      try {
        const [assetRes, statusRes, typeRes] = await Promise.all([
          listAssets(
            {
              project_id: demoMode ? undefined : (selectedProjectId ?? undefined),
              search: search.trim() || undefined,
              limit: 100,
            },
            demoMode,
          ),
          listAssetStatuses(),
          listAssetTypes(),
        ]);
        if (cancelled) return;
        setAssets(assetRes.data);
        setStatuses(statusRes.data);
        setTypes(typeRes.data);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load database.");
        setAssets([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const t = window.setTimeout(
      () => {
        setLoading(true);
        void load();
      },
      search.trim() ? 300 : 0,
    );

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [selectedProjectId, demoMode, search, reloadToken, refreshKey]);

  async function handleCreate(payload: AssetCreateInput | AssetUpdateInput) {
    try {
      const res = await createAsset(payload as AssetCreateInput);
      toast.success("Property created", payload.name);
      setMode("list");
      setSelectedId(res.data.id);
      bumpRefresh();
    } catch (err) {
      throw err;
    }
  }

  async function handleUpdate(payload: AssetCreateInput | AssetUpdateInput) {
    if (!selectedId) return;
    try {
      await updateAsset(selectedId, payload as AssetUpdateInput);
      toast.success("Property updated", payload.name);
      setMode("list");
      bumpRefresh();
    } catch (err) {
      throw err;
    }
  }

  async function handleDelete() {
    if (!selectedId) return;
    const a = assets.find((x) => x.id === selectedId);
    if (!a) return;
    if (!window.confirm(`Delete "${a.name}"?`)) return;
    try {
      await deleteAsset(a.id);
      toast.success("Property deleted");
      setSelectedId(null);
      bumpRefresh();
    } catch (err) {
      toast.error(
        "Could not delete property",
        err instanceof Error ? err.message : undefined,
      );
    }
  }

  const selected = selectedId ? assets.find((a) => a.id === selectedId) : null;
  const statusById = new Map(statuses.map((s) => [s.id, s]));
  const typeById = new Map(types.map((t) => [t.id, t]));

  if (!selectedProjectId && !demoMode) {
    return (
      <div className="flex h-full items-center justify-center p-6 bg-[var(--ops-bg)]">
        <EmptyState
          title="No development selected"
          description="Create or select a development to view the database."
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 bg-[var(--ops-bg)]">
      <div className="flex min-w-0 flex-1 flex-col p-4 md:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ops-text)]">
              Database
            </h1>
            <p className="text-[15px] text-[var(--ops-text-secondary)] mt-1.5">
              Structured property records.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <label className="relative">
              <span className="sr-only">Search properties</span>
              <Icon
                name="search"
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ops-text-muted)]"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, code, owner…"
                className="h-10 w-64 rounded-full border border-transparent bg-white shadow-sm py-2 pr-4 pl-10 text-[14px] text-[var(--ops-text)] placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-border-subtle)] focus:outline-none focus:ring-4 focus:ring-[var(--ops-accent-muted)] transition-all"
              />
            </label>
            {!demoMode ? (
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setMode("create");
                  setSelectedId(null);
                }}
                disabled={!canEdit}
                className="rounded-full px-5 shadow-sm"
                title={canEdit ? undefined : "Operator+ role required"}
              >
                <Icon name="plus" size={16} />
                Add property
              </Button>
            ) : null}
          </div>
        </div>

        {demoMode ? (
          <div className="mb-4 rounded-[var(--ops-radius-lg)] border border-[var(--ops-warning)]/20 bg-[var(--ops-warning-muted)] p-3 text-[13px] font-medium text-[var(--ops-warning)] flex items-center gap-2">
            <Icon name="info" size={16} />
            Demo Mode is read-only. Turn Demo Mode off to edit real data.
          </div>
        ) : null}

        {mode === "create" && !demoMode ? (
          <div className="mb-6 rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] bg-white p-6 md:p-8 shadow-sm">
            <h2 className="mb-6 text-[20px] font-bold text-[var(--ops-text)]">
              Create Property
            </h2>
            <AssetForm
              mode="create"
              projectId={selectedProjectId ?? ""}
              types={types}
              statuses={statuses}
              onSubmit={handleCreate}
              onCancel={() => setMode("list")}
            />
          </div>
        ) : null}

        {mode === "edit" && selected && !demoMode ? (
          <div className="mb-6 rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] bg-white p-6 md:p-8 shadow-sm">
            <h2 className="mb-6 text-[20px] font-bold text-[var(--ops-text)]">
              Edit Property
            </h2>
            <AssetForm
              mode="edit"
              projectId={selectedProjectId ?? ""}
              initial={selected}
              types={types}
              statuses={statuses}
              onSubmit={handleUpdate}
              onCancel={() => setMode("list")}
            />
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-auto rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] bg-white shadow-sm">
          {loading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-[var(--ops-radius-lg)]" />
              ))}
            </div>
          ) : null}

          {!loading && error ? (
            <div className="p-6">
              <ErrorState message={error} onRetry={reload} />
            </div>
          ) : null}

          {!loading && !error && assets.length === 0 ? (
            <div className="p-12">
              <EmptyState
                title="NO PROPERTIES"
                description="No properties in this development yet. Primary creation happens in the property workspace; you can also add one here."
                action={
                  canEdit && !demoMode ? (
                    <Button variant="primary" size="md" onClick={() => setMode("create")} className="rounded-full px-6">
                      <Icon name="plus" size={16} />
                      Add property
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : null}

          {!loading && !error && assets.length > 0 ? (
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 text-[12px] font-bold tracking-wider text-[var(--ops-text-muted)] uppercase border-b border-[var(--ops-border-subtle)]">
                <tr>
                  <th className="px-6 py-4 font-bold">Code</th>
                  <th className="px-6 py-4 font-bold">Name</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold">Type</th>
                  <th className="px-6 py-4 font-bold">Owner</th>
                  <th className="px-6 py-4 font-bold">Capacity</th>
                  <th className="px-6 py-4 font-bold">Placed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ops-border-subtle)]">
                {assets.map((asset) => {
                  const status = asset.asset_status_id
                    ? statusById.get(asset.asset_status_id)
                    : undefined;
                  const type = asset.asset_type_id
                    ? typeById.get(asset.asset_type_id)
                    : undefined;
                  const active = asset.id === selected?.id;
                  return (
                    <tr
                      key={asset.id}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-[var(--ops-surface-hover)]",
                        active && "bg-[var(--ops-accent-muted)]",
                      )}
                      onClick={() => {
                        setSelectedId(asset.id);
                        setMode("list");
                      }}
                    >
                      <td className="px-6 py-4 font-mono text-[13px] font-semibold text-[var(--ops-text-secondary)] whitespace-nowrap">
                        {asset.code ?? "—"}
                      </td>
                      <td className="px-6 py-4 font-semibold text-[14px] text-[var(--ops-text)] whitespace-nowrap">
                        {asset.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {status ? (
                          <span className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ backgroundColor: statusColor(status.slug, status.color) + '15', color: statusColor(status.slug, status.color) }}>
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: statusColor(status.slug, status.color) }}
                            />
                            {status.name}
                          </span>
                        ) : (
                          <span className="text-[14px] text-[var(--ops-text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[14px] text-[var(--ops-text-secondary)] whitespace-nowrap">
                        {type?.name ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-[14px] text-[var(--ops-text-secondary)] truncate max-w-[150px]">
                        {asset.owner ?? "—"}
                      </td>
                      <td className="px-6 py-4 font-mono text-[13px] text-[var(--ops-text-secondary)] whitespace-nowrap">
                        {String(asset.metadata.capacity ?? asset.metadata.pax ?? "—")}
                      </td>
                      <td className="px-6 py-4 font-mono text-[13px] text-[var(--ops-text-secondary)] whitespace-nowrap">
                        {String(asset.metadata.placed ?? "—")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : null}
        </div>
      </div>

      {selected && mode === "list" ? (
        <AssetDetailPanel
          asset={selected}
          type={
            selected.asset_type_id
              ? typeById.get(selected.asset_type_id)
              : undefined
          }
          status={
            selected.asset_status_id
              ? statusById.get(selected.asset_status_id)
              : undefined
          }
          onEdit={() => setMode("edit")}
          onDelete={() => void handleDelete()}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </div>
  );
}
