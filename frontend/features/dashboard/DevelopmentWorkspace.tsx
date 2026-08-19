"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { AssetForm } from "@/features/assets/AssetForm";
import { FilterControls } from "@/features/dashboard/FilterControls";
import { InfoPanel } from "@/features/dashboard/InfoPanel";
import { MapContainer } from "@/features/dashboard/MapContainer";
import { VillaListView } from "@/features/dashboard/VillaListView";
import { cn } from "@/lib/cn";
import {
  createAsset,
  deleteAsset,
  listAssets,
  updateAsset,
} from "@/services/assets";
import {
  getProjectSummary,
  listAssetStatuses,
} from "@/services/dashboard";
import { listAssetTypes } from "@/services/asset-types";
import { useShell } from "@/stores/shell-context";
import { useToast } from "@/stores/toast-context";
import { useUser } from "@/stores/user-context";
import type {
  Asset,
  AssetCreateInput,
  AssetStatus,
  AssetType,
  AssetUpdateInput,
  ProjectSummary,
} from "@/types/domain";

type ViewMode = "map" | "list";
type FormMode = "create" | "edit" | null;
type Point = { x: number; y: number };

export function DevelopmentWorkspace({
  projectId,
}: {
  projectId?: string | null;
}) {
  const {
    filters,
    selectedAssetId,
    setSelectedAssetId,
    setInfoPanelOpen,
    selectedProjectId,
    demoMode,
    bumpRefresh,
    refreshKey,
  } = useShell();
  const resolvedProjectId = projectId ?? selectedProjectId;
  const user = useUser();
  const toast = useToast();

  const [view, setView] = useState<ViewMode>("map");
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [placement, setPlacement] = useState<Point | null>(null);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [statuses, setStatuses] = useState<AssetStatus[]>([]);
  const [types, setTypes] = useState<AssetType[]>([]);
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const role = user?.role;
  const canEdit = role === "admin" || role === "manager" || role === "operator";

  const reload = useCallback(() => {
    setReloadToken((n) => n + 1);
  }, []);

  const pendingSelectIdRef = useRef<string | null>(null);
  const selectedAssetIdRef = useRef<string | null>(selectedAssetId);
  useEffect(() => {
    selectedAssetIdRef.current = selectedAssetId;
  }, [selectedAssetId]);

  useEffect(() => {
    if (!resolvedProjectId && !demoMode) return;
    let cancelled = false;

    async function load() {
      try {
        const queryParams = {
          project_id: demoMode ? undefined : (resolvedProjectId ?? undefined),
          search: filters.search.trim() || undefined,
          status_slugs: filters.statusSlugs.length > 0
            ? filters.statusSlugs
            : undefined,
          type_slugs: filters.typeSlugs.length > 0
            ? filters.typeSlugs
            : undefined,
          limit: 100,
        };

        const [assetsRes, statusesRes, typesRes, summaryRes] = await Promise.all([
          listAssets(queryParams, demoMode),
          listAssetStatuses(),
          listAssetTypes(),
          getProjectSummary(resolvedProjectId ?? "", demoMode),
        ]);

        if (cancelled) return;
        setAssets(assetsRes.data);
        setStatuses(statusesRes.data);
        setTypes(typesRes.data);
        setSummary(summaryRes.data);
        setError(null);

        if (pendingSelectIdRef.current) {
          const id = pendingSelectIdRef.current;
          pendingSelectIdRef.current = null;
          if (assetsRes.data.some((a) => a.id === id)) {
            setSelectedAssetId(id);
            setInfoPanelOpen(true);
          }
        } else if (
          selectedAssetIdRef.current &&
          !assetsRes.data.some((a) => a.id === selectedAssetIdRef.current)
        ) {
          setSelectedAssetId(null);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load workspace.");
        setAssets([]);
        setSummary(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      void load();
    });

    return () => {
      cancelled = true;
    };
  }, [resolvedProjectId, demoMode, filters.search, filters.statusSlugs, filters.typeSlugs, reloadToken, refreshKey, setSelectedAssetId, setInfoPanelOpen]);

  function openCreate() {
    setFormMode("create");
    setPlacement(null);
    setSelectedAssetId(null);
    setInfoPanelOpen(false);
  }

  function openEdit(asset: Asset) {
    const pos = readPlacement(asset);
    setSelectedAssetId(asset.id);
    setPlacement(pos);
    setFormMode("edit");
    setInfoPanelOpen(false);
  }

  function closeForm() {
    setFormMode(null);
    setPlacement(null);
  }

  async function handleCreateSubmit(payload: AssetCreateInput | AssetUpdateInput) {
    try {
      const res = await createAsset(payload as AssetCreateInput);
      pendingSelectIdRef.current = res.data.id;
      closeForm();
      toast.success("Property created", payload.name);
      bumpRefresh();
    } catch (err) {
      throw err;
    }
  }

  async function handleEditSubmit(payload: AssetCreateInput | AssetUpdateInput) {
    if (!selectedAssetId) return;
    try {
      await updateAsset(selectedAssetId, payload as AssetUpdateInput);
      pendingSelectIdRef.current = selectedAssetId;
      closeForm();
      toast.success("Property updated");
      bumpRefresh();
    } catch (err) {
      throw err;
    }
  }

  async function handleDelete(asset: Asset) {
    if (!window.confirm(`Delete "${asset.name}"? This removes it from the map and list.`)) {
      return;
    }
    try {
      await deleteAsset(asset.id);
      setSelectedAssetId(null);
      setInfoPanelOpen(false);
      toast.success("Property deleted");
      bumpRefresh();
    } catch (err) {
      toast.error(
        "Could not delete property",
        err instanceof Error ? err.message : undefined,
      );
    }
  }

  if (!resolvedProjectId && !demoMode) {
    return (
      <div className="flex h-full items-center justify-center p-6 bg-[var(--ops-bg)]">
        <EmptyState
          title="No development selected"
          description="Create or select a development to operate on its properties."
        />
      </div>
    );
  }

  const selected = selectedAssetId
    ? assets.find((a) => a.id === selectedAssetId) ?? null
    : null;

  const addPropertyAction =
    canEdit && !demoMode ? (
      <Button variant="primary" size="md" onClick={openCreate} className="rounded-full px-5 shadow-sm">
        <Icon name="plus" size={16} />
        Add property
      </Button>
    ) : null;

  return (
    <div className="flex h-full min-h-0 bg-[var(--ops-bg)]">
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-[var(--ops-surface)] p-2.5 rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] shadow-[var(--ops-shadow-sm)]">
          <FilterControls statuses={statuses} types={types} />
          
          <div className="flex shrink-0 items-center gap-3 pr-1">
            {canEdit && !demoMode ? (
              <Button
                variant="primary"
                size="md"
                onClick={openCreate}
                className="rounded-full shadow-sm px-5"
              >
                <Icon name="plus" size={16} />
                Add property
              </Button>
            ) : !demoMode ? (
              <p className="max-w-[220px] text-right text-[12px] text-[var(--ops-text-muted)]">
                Add Property requires operator+ access.
              </p>
            ) : null}
            <div className="flex shrink-0 items-center overflow-hidden rounded-full border border-[var(--ops-border-subtle)] bg-[var(--ops-surface-hover)] p-1">
              <button
                type="button"
                onClick={() => setView("map")}
                aria-pressed={view === "map"}
                className={cn(
                  "flex h-8 items-center gap-2 rounded-full px-4 text-[13px] font-semibold transition-all duration-200",
                  view === "map"
                    ? "bg-white text-[var(--ops-accent-hover)] shadow-sm"
                    : "text-[var(--ops-text-secondary)] hover:text-[var(--ops-text)]",
                )}
              >
                <Icon name="map" size={16} />
                Map
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                aria-pressed={view === "list"}
                className={cn(
                  "flex h-8 items-center gap-2 rounded-full px-4 text-[13px] font-semibold transition-all duration-200",
                  view === "list"
                    ? "bg-white text-[var(--ops-accent-hover)] shadow-sm"
                    : "text-[var(--ops-text-secondary)] hover:text-[var(--ops-text)]",
                )}
              >
                <Icon name="list" size={16} />
                List
              </button>
            </div>
          </div>
        </div>

        {formMode ? (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--ops-info-muted)] border border-[var(--ops-info)]/20 rounded-[var(--ops-radius-lg)] text-[var(--ops-info)] text-[14px] font-medium">
            <Icon name="info" size={18} />
            {view === "map"
              ? "Click anywhere on the map to set this property's location, then save."
              : "Switch to Map view and click to place this property on the site plan."}
          </div>
        ) : null}

        <div className="flex flex-1 min-h-0 flex-col rounded-[var(--ops-radius-xl)] overflow-hidden shadow-[var(--ops-shadow-sm)] border border-[var(--ops-border-subtle)] bg-[var(--ops-surface)] relative">
          {view === "map" ? (
            <MapContainer
              assets={assets}
              statuses={statuses}
              types={types}
              summary={summary}
              loading={loading}
              error={error}
              onRetry={reload}
              placement={formMode ? placement : null}
              onPlace={formMode ? setPlacement : undefined}
              emptyAction={addPropertyAction}
            />
          ) : (
            <VillaListView
              assets={assets}
              statuses={statuses}
              types={types}
              loading={loading}
              error={error}
              onRetry={reload}
              emptyAction={addPropertyAction}
            />
          )}
        </div>
      </div>

      {formMode ? (
        <aside
          className="flex w-full shrink-0 flex-col border-l border-[var(--ops-border-subtle)] bg-[var(--ops-surface)] lg:w-[480px] shadow-[-8px_0_24px_rgba(0,0,0,0.03)] z-10"
          aria-label={formMode === "create" ? "New property" : "Edit property"}
        >
          <div className="flex h-[72px] items-center justify-between border-b border-[var(--ops-border-subtle)] px-6">
            <h2 className="text-[20px] font-bold text-[var(--ops-text)]">
              {formMode === "create" ? "New Property" : "Edit Property"}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-[var(--ops-surface-hover)]"
              onClick={closeForm}
              aria-label="Close form"
            >
              <Icon name="x" size={18} />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-6 bg-[var(--ops-bg)]">
            {formMode === "edit" && !selected ? (
              <p className="text-[15px] text-[var(--ops-text-secondary)]">
                No property selected.
              </p>
            ) : (
              <AssetForm
                mode={formMode}
                projectId={resolvedProjectId ?? ""}
                initial={formMode === "edit" ? selected : null}
                types={types}
                statuses={statuses}
                onSubmit={
                  formMode === "create" ? handleCreateSubmit : handleEditSubmit
                }
                onCancel={closeForm}
                placement={placement}
              />
            )}
          </div>
        </aside>
      ) : (
        <InfoPanel
          assets={assets}
          statuses={statuses}
          types={types}
          onEdit={!demoMode ? openEdit : undefined}
          onDelete={!demoMode ? handleDelete : undefined}
        />
      )}
    </div>
  );
}

function readPlacement(asset: Asset): Point | null {
  const x = Number(asset.metadata.map_x);
  const y = Number(asset.metadata.map_y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}
