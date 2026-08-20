"use client";

/**
 * General settings (Phase 4).
 *
 * Workspace identity reads/updates the canonical Project record — one source
 * of truth, no duplicate settings table. Name/description edits are gated to
 * managers and real mode; the server action (`updateProject`) enforces
 * `requireRole(manager)` and RLS as the authoritative layer.
 *
 * Operational defaults (Property Types, Status Engine) live in this section
 * because they are business/application configuration.
 */

import { useEffect, useState } from "react";

import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { DEMO_PROJECT } from "@/lib/demo/dataset";
import { getProject, updateProject } from "@/services/projects";
import { useShell } from "@/stores/shell-context";
import { usePermissions } from "@/stores/user-context";
import { useToast } from "@/stores/toast-context";
import type { Project } from "@/types/domain";
import { AssetTypesSection } from "@/features/settings/AssetTypesSection";
import { StatusEnginePage } from "@/features/status/StatusEnginePage";

const DEMO_PROJECT_VIEW: Project = {
  id: DEMO_PROJECT.id,
  name: DEMO_PROJECT.name,
  slug: DEMO_PROJECT.slug,
  description: DEMO_PROJECT.description,
  status: DEMO_PROJECT.status,
  created_at: "2026-07-01T00:00:00.000Z",
  updated_at: "2026-07-01T00:00:00.000Z",
  created_by: null,
  updated_by: null,
};

export function GeneralSettingsSection() {
  const toast = useToast();
  const { selectedProjectId, demoMode, refreshKey, bumpRefresh } = useShell();
  const { canManage } = usePermissions();
  const canMutate = canManage && !demoMode;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (demoMode || !selectedProjectId) return;
    let cancelled = false;
    getProject(selectedProjectId)
      .then((res) => {
        if (cancelled) return;
        setProject(res.data);
        setName(res.data.name);
        setDescription(res.data.description ?? "");
        setError(null);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || "Failed to load workspace settings.");
        setProject(null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [demoMode, selectedProjectId, refreshKey, reloadToken]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!project) return;
    if (!name.trim()) {
      toast.error("Name required", "Workspace name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      const res = await updateProject(project.id, {
        name: name.trim(),
        description: description.trim() || null,
      });
      setProject(res.data);
      setName(res.data.name);
      setDescription(res.data.description ?? "");
      toast.success("Workspace updated", res.data.name);
      bumpRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed.";
      toast.error("Could not update workspace", message);
    } finally {
      setSaving(false);
    }
  }

  function renderWorkspace() {
    if (demoMode) {
      return (
        <div className="space-y-4 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-[var(--ops-text-muted)]">
                Workspace name
              </p>
              <p className="mt-1 rounded-[var(--ops-radius)] border border-[var(--ops-border-subtle)] bg-[var(--ops-bg)] px-3 py-2 text-sm text-[var(--ops-text)]">
                {DEMO_PROJECT_VIEW.name}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--ops-text-muted)]">Slug</p>
              <p className="mt-1 rounded-[var(--ops-radius)] border border-[var(--ops-border-subtle)] bg-[var(--ops-bg)] px-3 py-2 font-mono text-sm text-[var(--ops-text-secondary)]">
                {DEMO_PROJECT_VIEW.slug}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs text-[var(--ops-text-muted)]">Description</p>
            <p className="mt-1 rounded-[var(--ops-radius)] border border-[var(--ops-border-subtle)] bg-[var(--ops-bg)] px-3 py-2 text-sm text-[var(--ops-text-secondary)]">
              {DEMO_PROJECT_VIEW.description || "No description."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ops-border)] px-2.5 py-1 text-xs capitalize text-[var(--ops-text-secondary)]">
              <span className="h-2 w-2 rounded-full bg-[var(--ops-accent)]" />
              {DEMO_PROJECT_VIEW.status}
            </span>
            <span className="text-xs text-[var(--ops-text-muted)]">
              Demo Mode is read-only
            </span>
          </div>
        </div>
      );
    }

    if (!selectedProjectId) {
      return (
        <div className="p-4">
          <EmptyState
            title="NO WORKSPACE SELECTED"
            description="Select a workspace to view and update its General settings."
          />
        </div>
      );
    }

    if (loading) {
      return (
        <div className="space-y-2 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-4">
          <ErrorState
            message={error}
            onRetry={() => setReloadToken((n) => n + 1)}
          />
        </div>
      );
    }

    if (!project) {
      return (
        <div className="p-4">
          <EmptyState
            title="NO WORKSPACE SELECTED"
            description="Select a workspace to view and update its General settings."
          />
        </div>
      );
    }

    return (
      <form onSubmit={(e) => void handleSave(e)} className="space-y-4 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs text-[var(--ops-text-muted)]">
            Workspace name *
            {canMutate ? (
              <input
                className="mt-1 w-full rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-bg)] px-3 py-2 text-sm text-[var(--ops-text)]"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            ) : (
              <span className="mt-1 block rounded-[var(--ops-radius)] border border-[var(--ops-border-subtle)] bg-[var(--ops-bg)] px-3 py-2 text-sm text-[var(--ops-text)]">
                {project.name}
              </span>
            )}
          </label>
          <div>
            <p className="text-xs text-[var(--ops-text-muted)]">Slug</p>
            <p className="mt-1 rounded-[var(--ops-radius)] border border-[var(--ops-border-subtle)] bg-[var(--ops-bg)] px-3 py-2 font-mono text-sm text-[var(--ops-text-secondary)]">
              {project.slug}
            </p>
          </div>
        </div>

        <label className="block text-xs text-[var(--ops-text-muted)]">
          Description
          {canMutate ? (
            <textarea
              className="mt-1 w-full rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-bg)] px-3 py-2 text-sm text-[var(--ops-text)]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          ) : (
            <span className="mt-1 block rounded-[var(--ops-radius)] border border-[var(--ops-border-subtle)] bg-[var(--ops-bg)] px-3 py-2 text-sm text-[var(--ops-text-secondary)]">
              {project.description || "No description."}
            </span>
          )}
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ops-border)] px-2.5 py-1 text-xs capitalize text-[var(--ops-text-secondary)]">
            <span className="h-2 w-2 rounded-full bg-[var(--ops-accent)]" />
            {project.status}
          </span>
          {canMutate ? (
            <Button type="submit" variant="primary" size="sm" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          ) : (
            <span className="text-xs text-[var(--ops-text-muted)]">
              {demoMode
                ? "Demo Mode is read-only"
                : "Manager access required to edit"}
            </span>
          )}
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] shadow-sm bg-[var(--ops-surface)]">
        <header className="flex flex-wrap items-start gap-3 border-b border-[var(--ops-border-subtle)] p-4">
          <div className="flex items-center gap-2">
            <Icon name="settings" size={16} className="text-[var(--ops-text-muted)]" />
            <h2 className="text-sm font-semibold text-[var(--ops-text)]">
              Workspace
            </h2>
          </div>
          <p className="mt-1 w-full max-w-xl text-[13px] text-[var(--ops-text-secondary)]">
            Business/workspace identity. This is the canonical project record —
            the sidebar and dashboard read the same value.
          </p>
        </header>
        {renderWorkspace()}
      </section>

      <section className="rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] shadow-sm bg-[var(--ops-surface)] p-4">
        <div className="flex items-center gap-2">
          <Icon name="list" size={16} className="text-[var(--ops-text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--ops-text)]">
            Operational defaults
          </h2>
        </div>
        <p className="mt-1 max-w-xl text-[13px] text-[var(--ops-text-secondary)]">
          Property types and statuses drive forms, filters, map markers, and
          KPIs across the app.
        </p>
      </section>

      <AssetTypesSection />
      <StatusEnginePage />
    </div>
  );
}