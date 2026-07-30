"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AssetDetailPanel } from "@/features/assets/AssetDetailPanel";
import { AssetForm } from "@/features/assets/AssetForm";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
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
import { pushMockNotification } from "@/services/notifications";
import { useShell } from "@/stores/shell-context";
import { useToast } from "@/stores/toast-context";
import type {
  Asset,
  AssetCreateInput,
  AssetStatus,
  AssetType,
  AssetUpdateInput,
} from "@/types/domain";

export function AssetsPage() {
  const { selectedProjectId } = useShell();
  const toast = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [types, setTypes] = useState<AssetType[]>([]);
  const [statuses, setStatuses] = useState<AssetStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [reloadToken, setReloadToken] = useState(0);

  const typeById = useMemo(
    () => new Map(types.map((t) => [t.id, t])),
    [types],
  );
  const statusById = useMemo(
    () => new Map(statuses.map((s) => [s.id, s])),
    [statuses],
  );

  const selected =
    selectedId && assets.some((a) => a.id === selectedId)
      ? (assets.find((a) => a.id === selectedId) ?? null)
      : null;

  const reload = useCallback(() => {
    setReloadToken((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listAssetTypes(), listAssetStatuses()])
      .then(([t, s]) => {
        if (cancelled) return;
        setTypes(t.data);
        setStatuses(s.data);
      })
      .catch(() => {
        if (!cancelled) {
          setTypes([]);
          setStatuses([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;

    let cancelled = false;
    listAssets({
      project_id: selectedProjectId,
      search: search || undefined,
      limit: 100,
    })
      .then((res) => {
        if (cancelled) return;
        setAssets(res.data);
        setError(null);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || "Failed to load assets.");
        setAssets([]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedProjectId, search, reloadToken]);

  if (!selectedProjectId) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-[var(--ops-text-secondary)]">
        Select a project to manage assets.
      </div>
    );
  }

  async function handleCreate(payload: AssetCreateInput | AssetUpdateInput) {
    try {
      const input = payload as AssetCreateInput;
      await createAsset(input);
      // Surface assignment awareness in the notification center (mock path).
      for (const assignee of input.assignees ?? []) {
        pushMockNotification({
          kind: "assignment",
          severity: "info",
          title: `Assigned to ${input.name}`,
          message: `You were assigned to asset “${input.name}”.`,
          recipient: assignee,
        });
      }
      toast.success("Asset created", input.name);
      setMode("list");
      reload();
    } catch (err) {
      toast.error(
        "Could not create asset",
        err instanceof Error ? err.message : undefined,
      );
      throw err;
    }
  }

  async function handleUpdate(payload: AssetCreateInput | AssetUpdateInput) {
    if (!selectedId) return;
    try {
      const input = payload as AssetUpdateInput;
      const previous = new Set(selected?.assignees ?? []);
      await updateAsset(selectedId, input);
      const nextAssignees = input.assignees ?? [];
      for (const assignee of nextAssignees) {
        if (previous.has(assignee)) continue;
        pushMockNotification({
          kind: "assignment",
          severity: "info",
          title: `Assigned to ${input.name ?? selected?.name ?? "asset"}`,
          message: `You were assigned to asset “${input.name ?? selected?.name}”.`,
          recipient: assignee,
        });
      }
      toast.success("Asset updated");
      setMode("list");
      reload();
    } catch (err) {
      toast.error(
        "Could not update asset",
        err instanceof Error ? err.message : undefined,
      );
      throw err;
    }
  }

  async function handleDelete() {
    if (!selectedId) return;
    if (!window.confirm("Delete this asset? This soft-deletes the record.")) {
      return;
    }
    try {
      await deleteAsset(selectedId);
      toast.success("Asset deleted");
      setSelectedId(null);
      setMode("list");
      reload();
    } catch (err) {
      toast.error(
        "Could not delete asset",
        err instanceof Error ? err.message : undefined,
      );
    }
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-3 lg:p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div>
            <h1 className="text-lg font-semibold text-[var(--ops-text)]">Assets</h1>
            <p className="text-xs text-[var(--ops-text-muted)]">
              Manage physical assets for the selected project
            </p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <label className="relative">
              <span className="sr-only">Search assets</span>
              <Icon
                name="search"
                size={14}
                className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[var(--ops-text-muted)]"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, code, owner…"
                className="h-9 w-56 rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-surface)] py-2 pr-3 pl-8 text-sm"
              />
            </label>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setMode("create");
                setSelectedId(null);
              }}
            >
              <Icon name="plus" size={14} />
              New asset
            </Button>
          </div>
        </div>

        {mode === "create" ? (
          <div className="mb-3 rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-surface)] p-4">
            <h2 className="mb-3 text-sm font-semibold text-[var(--ops-text)]">
              Create asset
            </h2>
            <AssetForm
              mode="create"
              projectId={selectedProjectId}
              types={types}
              statuses={statuses}
              onSubmit={handleCreate}
              onCancel={() => setMode("list")}
            />
          </div>
        ) : null}

        {mode === "edit" && selected ? (
          <div className="mb-3 rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-surface)] p-4">
            <h2 className="mb-3 text-sm font-semibold text-[var(--ops-text)]">
              Edit asset
            </h2>
            <AssetForm
              mode="edit"
              projectId={selectedProjectId}
              initial={selected}
              types={types}
              statuses={statuses}
              onSubmit={handleUpdate}
              onCancel={() => setMode("list")}
            />
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-auto rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-surface)]">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : null}

          {!loading && error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : null}

          {!loading && !error && assets.length === 0 ? (
            <EmptyState
              title="NO ASSETS"
              description="Create an asset for this project to begin operations tracking."
              action={
                <Button variant="primary" size="sm" onClick={() => setMode("create")}>
                  New asset
                </Button>
              }
            />
          ) : null}

          {!loading && !error && assets.length > 0 ? (
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-[var(--ops-bg-elevated)] text-[11px] tracking-wide text-[var(--ops-text-muted)] uppercase">
                <tr className="border-b border-[var(--ops-border)]">
                  <th className="px-3 py-2.5 font-medium">Code</th>
                  <th className="px-3 py-2.5 font-medium">Name</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Type</th>
                  <th className="px-3 py-2.5 font-medium">Owner</th>
                  <th className="px-3 py-2.5 font-medium">Assignees</th>
                </tr>
              </thead>
              <tbody>
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
                        "cursor-pointer border-b border-[var(--ops-border-subtle)] hover:bg-[var(--ops-surface-hover)]",
                        active && "bg-[var(--ops-accent-muted)]",
                      )}
                      onClick={() => {
                        setSelectedId(asset.id);
                        setMode("list");
                      }}
                    >
                      <td className="px-3 py-2.5 font-mono text-xs text-[var(--ops-text-secondary)]">
                        {asset.code ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-[var(--ops-text)]">
                        {asset.name}
                      </td>
                      <td className="px-3 py-2.5">
                        {status ? (
                          <span className="inline-flex items-center gap-1.5 text-[var(--ops-text-secondary)]">
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
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--ops-text-secondary)]">
                        {type?.name ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--ops-text-secondary)]">
                        {asset.owner ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--ops-text-secondary)]">
                        {asset.assignees.length
                          ? asset.assignees.join(", ")
                          : "—"}
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
