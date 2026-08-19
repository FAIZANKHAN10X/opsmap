"use client";

/**
 * Project / development bootstrap (Phase 15 Step 6).
 *
 * Owner-facing surface for creating a development, renaming it, archiving it
 * (status -> "archived" via the existing updateProject path) or deleting it
 * (existing soft-delete). The ProjectSelector only lists active developments,
 * so archived/deleted developments disappear from the top-bar selector. All
 * mutations run through the existing project actions/service/repository and
 * the existing manager+ permission model; the page reuses the Phase 15 change
 * propagation mechanism (bumpRefresh -> refreshKey) so the selector and other
 * mounted surfaces refetch without a browser reload. Demo Mode stays
 * read-only.
 */

import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  createProject,
  deleteProject,
  listProjects,
  updateProject,
} from "@/services/projects";
import { useShell } from "@/stores/shell-context";
import { useToast } from "@/stores/toast-context";
import { usePermissions } from "@/stores/user-context";
import type { Project } from "@/types/domain";

type FormMode = "list" | "create" | "edit";

const emptyForm = {
  name: "",
  slug: "",
  description: "",
};

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ProjectsPage() {
  const toast = useToast();
  const { demoMode, refreshKey, bumpRefresh } = useShell();
  const { canManage } = usePermissions();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<FormMode>("list");
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    listProjects({ page: 1, limit: 100, status: "active" })
      .then((res) => {
        if (cancelled) return;
        setProjects(res.data);
        setError(null);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || "Failed to load developments.");
        setProjects([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken, refreshKey]);

  function openCreate() {
    setMode("create");
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
  }

  function openEdit(project: Project) {
    setMode("edit");
    setEditing(project);
    setForm({
      name: project.name,
      slug: project.slug,
      description: project.description ?? "",
    });
    setFormError(null);
  }

  function closeForm() {
    setMode("list");
    setEditing(null);
    setFormError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!form.name.trim() || !form.slug.trim()) {
      setFormError("Name and slug are required.");
      return;
    }

    setSaving(true);
    try {
      if (mode === "create") {
        await createProject({
          name: form.name.trim(),
          slug: form.slug.trim(),
          description: form.description.trim() || null,
        });
        toast.success("Development created", form.name.trim());
      } else if (editing) {
        await updateProject(editing.id, {
          name: form.name.trim(),
          slug: form.slug.trim(),
          description: form.description.trim() || null,
        });
        toast.success("Development updated", form.name.trim());
      }
      closeForm();
      bumpRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed.";
      setFormError(message);
      toast.error("Could not save development", message);
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(project: Project) {
    if (
      !window.confirm(
        `Archive "${project.name}"? It will be removed from the active project selector.`,
      )
    ) {
      return;
    }
    try {
      await updateProject(project.id, { status: "archived" });
      toast.success("Development archived", project.name);
      bumpRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Archive failed.";
      toast.error("Could not archive development", message);
    }
  }

  async function handleDelete(project: Project) {
    if (
      !window.confirm(
        `Delete "${project.name}"? This soft-deletes the development and hides it everywhere.`,
      )
    ) {
      return;
    }
    try {
      await deleteProject(project.id);
      if (editing?.id === project.id) closeForm();
      toast.success("Development deleted", project.name);
      bumpRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed.";
      toast.error("Could not delete development", message);
    }
  }

  const canMutate = canManage && !demoMode;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto p-3 lg:p-4">
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[var(--ops-text)]">
            Developments
          </h1>
          <p className="mt-0.5 max-w-xl text-sm text-[var(--ops-text-secondary)]">
            Create and manage the developments the workspaces operate on.
            Archived or deleted developments leave the active project selector.
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {canMutate ? (
            <Button variant="primary" size="sm" onClick={openCreate}>
              <Icon name="plus" size={14} />
              New development
            </Button>
          ) : null}
        </div>
      </div>

      {demoMode ? (
        <div className="mb-4 rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-surface)] p-3 text-sm text-[var(--ops-text-secondary)]">
          Demo Mode is read-only — development changes are disabled.
        </div>
      ) : null}

      {!canManage && !demoMode ? (
        <div className="mb-4 rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-surface)] p-3 text-sm text-[var(--ops-text-secondary)]">
          Your role can view developments. A manager or admin can create, rename,
          archive, or delete them.
        </div>
      ) : null}

      {mode !== "list" && canMutate ? (
        <section className="mb-4 rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-surface)] p-4">
          <h2 className="mb-3 text-sm font-semibold text-[var(--ops-text)]">
            {mode === "create" ? "Create development" : "Rename development"}
          </h2>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs text-[var(--ops-text-muted)]">
                Name *
                <input
                  className="mt-1 w-full rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-bg)] px-3 py-2 text-sm text-[var(--ops-text)]"
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      name,
                      slug: mode === "create" ? slugify(name) : prev.slug,
                    }));
                  }}
                  required
                />
              </label>
              <label className="block text-xs text-[var(--ops-text-muted)]">
                Slug *
                <input
                  className="mt-1 w-full rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-bg)] px-3 py-2 font-mono text-sm text-[var(--ops-text)]"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  required
                />
              </label>
              <label className="block text-xs text-[var(--ops-text-muted)] sm:col-span-2">
                Description
                <input
                  className="mt-1 w-full rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-bg)] px-3 py-2 text-sm text-[var(--ops-text)]"
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
              </label>
            </div>
            {formError ? (
              <p className="text-sm text-[var(--ops-danger)]" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={closeForm} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? "Saving…" : "Save development"}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="min-h-0 flex-1 overflow-auto rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-surface)]">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : null}

        {!loading && error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : null}

        {!loading && !error && projects.length === 0 ? (
          <EmptyState
            title="NO DEVELOPMENTS"
            description="Create your first development to start operating the workspaces."
            action={
              canMutate ? (
                <Button variant="primary" size="sm" onClick={openCreate}>
                  <Icon name="plus" size={14} />
                  Create your first development
                </Button>
              ) : null
            }
          />
        ) : null}

        {!loading && !error && projects.length > 0 ? (
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-[var(--ops-bg-elevated)] text-[11px] tracking-wide text-[var(--ops-text-muted)] uppercase">
              <tr className="border-b border-[var(--ops-border)]">
                <th className="px-3 py-2.5 font-medium">Name</th>
                <th className="px-3 py-2.5 font-medium">Slug</th>
                <th className="px-3 py-2.5 font-medium">Description</th>
                {canMutate ? <th className="px-3 py-2.5 font-medium">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr
                  key={project.id}
                  className="border-b border-[var(--ops-border-subtle)] hover:bg-[var(--ops-surface-hover)]"
                >
                  <td className="px-3 py-2.5 font-medium text-[var(--ops-text)]">
                    {project.name}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-[var(--ops-text-secondary)]">
                    {project.slug}
                  </td>
                  <td className="max-w-[260px] truncate px-3 py-2.5 text-[var(--ops-text-secondary)]">
                    {project.description ?? "—"}
                  </td>
                  {canMutate ? (
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(project)}>
                          Rename
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleArchive(project)}
                        >
                          Archive
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleDelete(project)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>
    </div>
  );
}