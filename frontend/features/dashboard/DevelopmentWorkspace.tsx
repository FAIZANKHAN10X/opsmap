"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { AssetForm } from "@/features/assets/AssetForm";
import { FilterControls } from "@/features/dashboard/FilterControls";
import { InfoPanel } from "@/features/dashboard/InfoPanel";
import { MapContainer } from "@/features/dashboard/MapContainer";
import { VillaListView } from "@/features/dashboard/VillaListView";
import { cn } from "@/lib/cn";
import type { Point } from "@/lib/workspace-layout";
import {
  createAsset,
  deleteAsset,
  listAssets,
  updateAsset,
} from "@/services/assets";
import { getProjectSummary, listAssetStatuses } from "@/services/dashboard";
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
  ProjectSummary,
} from "@/types/domain";
import type { AssetFilterState, WorkspaceViewMode } from "@/types/ui";

/**
 * ULLUWATU "26 — the property/development operations workspace (Phase 15).
 * Property map + villa list + property selection/info panel for the selected
 * development, plus owner CRUD (Step 4a): add a villa, edit the selected one,
 * delete/soft-delete (manager+), and click-to-place on the map. Dashboard KPIs
 * live on /dashboard; Demo Mode stays read-only.
 */
export function DevelopmentWorkspace() {
  const { selectedProjectId, filters, demoMode } = useShell();
  const [statuses, setStatuses] = useState<AssetStatus[]>([]);
  const [types, setTypes] = useState<AssetType[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listAssetStatuses(), listAssetTypes()])
      .then(([statusRes, typeRes]) => {
        if (cancelled) return;
        setStatuses(statusRes.data);
        setTypes(typeRes.data);
      })
      .catch(() => {
        if (cancelled) return;
        setStatuses([]);
        setTypes([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!selectedProjectId && !demoMode) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-[var(--ops-text-secondary)]">
        Select a project to open the workspace.
      </div>
    );
  }

  return (
    <ProjectWorkspace
      key={selectedProjectId ?? "demo"}
      projectId={selectedProjectId}
      demoMode={demoMode}
      filters={filters}
      statuses={statuses}
      types={types}
    />
  );
}

type ProjectWorkspaceProps = {
  projectId: string | null;
  demoMode: boolean;
  filters: AssetFilterState;
  statuses: AssetStatus[];
  types: AssetType[];
};

function ProjectWorkspace({
  projectId,
  demoMode,
  filters,
  statuses,
  types,
}: ProjectWorkspaceProps) {
  const {
    selectedAssetId,
    setSelectedAssetId,
    setInfoPanelOpen,
    refreshKey,
    bumpRefresh,
  } = useShell();
  const { canEdit } = usePermissions();
  const toast = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [view, setView] = useState<WorkspaceViewMode>("map");
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [placement, setPlacement] = useState<Point | null>(null);
  // Asset to (re)select after a reload resolves (create/edit), since the load
  // effect otherwise clears stale selections.
  const pendingSelectIdRef = useRef<string | null>(null);

  const reload = useCallback(() => {
    setReloadToken((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [assetsRes, summaryRes] = await Promise.all([
          listAssets(
            {
              project_id: demoMode ? undefined : (projectId ?? undefined),
              search: filters.search || undefined,
              status_slugs:
                filters.statusSlugs.length > 0 ? filters.statusSlugs : undefined,
              type_slugs:
                filters.typeSlugs.length > 0 ? filters.typeSlugs : undefined,
            },
            demoMode,
          ),
          getProjectSummary(projectId ?? "", demoMode),
        ]);
        if (cancelled) return;
        setAssets(assetsRes.data);
        setSummary(summaryRes.data);
        setError(null);
        const pending = pendingSelectIdRef.current;
        pendingSelectIdRef.current = null;
        if (pending) {
          setSelectedAssetId(pending);
          setInfoPanelOpen(true);
        } else {
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

    // Remount sets loading true via useState; reloads need the flag again.
    // Queue async work without synchronous setState in the effect body.
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      void load();
    });

    return () => {
      cancelled = true;
    };
  }, [projectId, demoMode, filters.search, filters.statusSlugs, filters.typeSlugs, reloadToken, refreshKey, setSelectedAssetId, setInfoPanelOpen]);

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
      toast.success("Villa created", payload.name);
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
      toast.success("Villa updated");
      bumpRefresh();
    } catch (err) {
      throw err;
    }
  }

  async function handleDelete(asset: Asset) {
    if (!window.confirm(`Delete "${asset.name}"? This soft-deletes the record.`)) {
      return;
    }
    try {
      await deleteAsset(asset.id);
      setSelectedAssetId(null);
      setInfoPanelOpen(false);
      toast.success("Villa deleted");
      bumpRefresh();
    } catch (err) {
      toast.error(
        "Could not delete villa",
        err instanceof Error ? err.message : undefined,
      );
    }
  }

  const selected = selectedAssetId
    ? assets.find((a) => a.id === selectedAssetId)
    : undefined;

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-hidden p-3 lg:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <FilterControls statuses={statuses} types={types} />
          <div className="flex shrink-0 items-center gap-2">
            {canEdit && !demoMode ? (
              <Button
                variant="primary"
                size="sm"
                onClick={openCreate}
                className="h-8"
              >
                <Icon name="plus" size={14} />
                Add villa
              </Button>
            ) : null}
            <div className="flex shrink-0 items-center overflow-hidden rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-surface)]">
              <button
                type="button"
                onClick={() => setView("map")}
                aria-pressed={view === "map"}
                className={cn(
                  "flex h-8 items-center gap-1.5 px-3 text-xs font-medium transition-colors",
                  view === "map"
                    ? "bg-[var(--ops-accent-muted)] text-[var(--ops-accent-hover)]"
                    : "text-[var(--ops-text-secondary)] hover:bg-[var(--ops-surface-hover)]",
                )}
              >
                <Icon name="map" size={14} />
                Property Map
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                aria-pressed={view === "list"}
                className={cn(
                  "flex h-8 items-center gap-1.5 border-l border-[var(--ops-border)] px-3 text-xs font-medium transition-colors",
                  view === "list"
                    ? "bg-[var(--ops-accent-muted)] text-[var(--ops-accent-hover)]"
                    : "text-[var(--ops-text-secondary)] hover:bg-[var(--ops-surface-hover)]",
                )}
              >
                <Icon name="list" size={14} />
                Villa List
              </button>
            </div>
          </div>
        </div>

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
          />
        ) : (
          <VillaListView
            assets={assets}
            statuses={statuses}
            types={types}
            loading={loading}
            error={error}
            onRetry={reload}
          />
        )}
      </div>

      {formMode ? (
        <aside
          className="flex w-full shrink-0 flex-col border-l border-[var(--ops-border)] bg-[var(--ops-bg-elevated)] lg:w-[440px]"
          aria-label={formMode === "create" ? "New villa" : "Edit villa"}
        >
          <div className="flex h-12 items-center justify-between border-b border-[var(--ops-border)] px-3">
            <p className="text-xs font-semibold tracking-wide text-[var(--ops-text-muted)] uppercase">
              {formMode === "create" ? "New villa" : "Edit villa"}
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={closeForm}
              aria-label="Close form"
            >
              <Icon name="x" size={16} />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {formMode === "edit" && !selected ? (
              <p className="text-sm text-[var(--ops-text-secondary)]">
                No property selected.
              </p>
            ) : (
              <AssetForm
                mode={formMode}
                projectId={projectId ?? ""}
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