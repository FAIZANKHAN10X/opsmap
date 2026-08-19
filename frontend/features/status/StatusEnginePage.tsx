"use client";

/**
 * Status Engine configuration UI.
 * Status colors and labels are the single source of visual truth for the app.
 */

import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { STATUS_COLOR_PRESETS, statusColor } from "@/lib/status-colors";
import {
  createAssetStatus,
  deleteAssetStatus,
  listAssetStatuses,
  seedDefaultStatuses,
  updateAssetStatus,
  type AssetStatusCreateInput,
} from "@/services/asset-statuses";
import { useToast } from "@/stores/toast-context";
import type { AssetStatus } from "@/types/domain";

type FormMode = "list" | "create" | "edit";

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  color: "#22c55e",
  sort_order: 0,
};

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function StatusEnginePage() {
  const toast = useToast();
  const [statuses, setStatuses] = useState<AssetStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<FormMode>("list");
  const [editing, setEditing] = useState<AssetStatus | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    listAssetStatuses()
      .then((res) => {
        if (cancelled) return;
        setStatuses(res.data);
        setError(null);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || "Failed to load statuses.");
        setStatuses([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  function openCreate() {
    setMode("create");
    setEditing(null);
    setForm({
      ...emptyForm,
      sort_order: statuses.length
        ? Math.max(...statuses.map((s) => s.sort_order)) + 1
        : 1,
    });
    setFormError(null);
  }

  function openEdit(status: AssetStatus) {
    setMode("edit");
    setEditing(status);
    setForm({
      name: status.name,
      slug: status.slug,
      description: status.description ?? "",
      color: status.color ?? "#64748b",
      sort_order: status.sort_order,
    });
    setFormError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!form.name.trim() || !form.slug.trim() || !form.color.trim()) {
      setFormError("Name, slug, and color are required.");
      return;
    }
    if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(form.color.trim())) {
      setFormError("Color must be hex, e.g. #22c55e.");
      return;
    }

    const payload: AssetStatusCreateInput = {
      name: form.name.trim(),
      slug: form.slug.trim().toLowerCase(),
      description: form.description.trim() || null,
      color: form.color.trim().toLowerCase(),
      sort_order: Number(form.sort_order) || 0,
    };

    setSaving(true);
    try {
      if (mode === "create") {
        await createAssetStatus(payload);
        toast.success("Status created", payload.name);
      } else if (editing) {
        await updateAssetStatus(editing.id, payload);
        toast.success("Status updated", payload.name);
      }
      setMode("list");
      setEditing(null);
      reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed.";
      setFormError(message);
      toast.error("Could not save status", message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(status: AssetStatus) {
    if (
      !window.confirm(
        `Delete status “${status.name}”? Assets using it must be reassigned first.`,
      )
    ) {
      return;
    }
    try {
      await deleteAssetStatus(status.id);
      if (editing?.id === status.id) {
        setMode("list");
        setEditing(null);
      }
      toast.success("Status deleted", status.name);
      reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed.";
      setError(message);
      toast.error("Could not delete status", message);
    }
  }

  async function handleSeed() {
    setSaving(true);
    try {
      const res = await seedDefaultStatuses();
      setStatuses(res.data);
      setError(null);
      toast.success("Default statuses seeded");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Seed failed.";
      setError(message);
      toast.error("Seed failed", message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[var(--ops-text)]">
            Status Engine
          </h1>
          <p className="mt-0.5 max-w-xl text-sm text-[var(--ops-text-secondary)]">
            Configure operational statuses and colors. Map markers, legend, and
            KPI chips derive appearance from this data — not hardcoded styles.
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void handleSeed()}
            disabled={saving}
          >
            Seed defaults
          </Button>
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Icon name="plus" size={14} />
            New status
          </Button>
        </div>
      </div>

      {/* Live legend preview — same resolution path as the map */}
      <section className="mb-4 rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-surface)] p-4">
        <p className="mb-3 text-[10px] font-semibold tracking-[0.14em] text-[var(--ops-text-muted)] uppercase">
          Legend preview
        </p>
        {loading ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-24" />
            ))}
          </div>
        ) : statuses.length === 0 ? (
          <p className="text-sm text-[var(--ops-text-secondary)]">
            No statuses configured yet.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {statuses.map((status) => {
              const color = statusColor(status.slug, status.color);
              return (
                <li
                  key={status.id}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--ops-border)] bg-[var(--ops-bg)] px-2.5 py-1 text-xs text-[var(--ops-text-secondary)]"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-sm ring-1 ring-black/20"
                    style={{ backgroundColor: color }}
                  />
                  {status.name}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {mode !== "list" ? (
        <section className="mb-4 rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-surface)] p-4">
          <h2 className="mb-3 text-sm font-semibold text-[var(--ops-text)]">
            {mode === "create" ? "Create status" : "Edit status"}
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
                      slug:
                        mode === "create" ? slugify(name) : prev.slug,
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
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </label>
              <label className="block text-xs text-[var(--ops-text-muted)]">
                Sort order
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-bg)] px-3 py-2 text-sm text-[var(--ops-text)]"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      sort_order: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <div>
                <p className="text-xs text-[var(--ops-text-muted)]">Color *</p>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={
                      /^#([0-9a-fA-F]{6})$/.test(form.color)
                        ? form.color
                        : "#64748b"
                    }
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, color: e.target.value }))
                    }
                    className="h-9 w-12 cursor-pointer rounded border border-[var(--ops-border)] bg-transparent"
                    aria-label="Pick color"
                  />
                  <input
                    className="w-full rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-bg)] px-3 py-2 font-mono text-sm text-[var(--ops-text)]"
                    value={form.color}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, color: e.target.value }))
                    }
                    placeholder="#22c55e"
                  />
                  <span
                    className="h-9 w-9 shrink-0 rounded-[var(--ops-radius)] border border-[var(--ops-border)]"
                    style={{
                      backgroundColor: statusColor(form.slug || "x", form.color),
                    }}
                    title="Preview"
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {STATUS_COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={cn(
                        "h-6 w-6 rounded-sm border border-black/20",
                        form.color.toLowerCase() === c &&
                          "ring-2 ring-[var(--ops-accent)] ring-offset-1 ring-offset-[var(--ops-surface)]",
                      )}
                      style={{ backgroundColor: c }}
                      onClick={() => setForm((prev) => ({ ...prev, color: c }))}
                      aria-label={`Use color ${c}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            {formError ? (
              <p className="text-sm text-[var(--ops-danger)]" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setMode("list");
                  setEditing(null);
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? "Saving…" : "Save status"}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="min-h-0 flex-1 overflow-auto rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-surface)]">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : null}

        {!loading && error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : null}

        {!loading && !error && statuses.length === 0 ? (
          <EmptyState
            title="NO STATUSES"
            description="Seed defaults or create your first operational status."
            action={
              <Button variant="primary" size="sm" onClick={() => void handleSeed()}>
                Seed defaults
              </Button>
            }
          />
        ) : null}

        {!loading && !error && statuses.length > 0 ? (
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-[var(--ops-bg-elevated)] text-[11px] tracking-wide text-[var(--ops-text-muted)] uppercase">
              <tr className="border-b border-[var(--ops-border)]">
                <th className="px-3 py-2.5 font-medium">Color</th>
                <th className="px-3 py-2.5 font-medium">Name</th>
                <th className="px-3 py-2.5 font-medium">Slug</th>
                <th className="px-3 py-2.5 font-medium">Order</th>
                <th className="px-3 py-2.5 font-medium">Description</th>
                <th className="px-3 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {statuses.map((status) => {
                const color = statusColor(status.slug, status.color);
                return (
                  <tr
                    key={status.id}
                    className="border-b border-[var(--ops-border-subtle)] hover:bg-[var(--ops-surface-hover)]"
                  >
                    <td className="px-3 py-2.5">
                      <span
                        className="inline-block h-5 w-5 rounded-sm ring-1 ring-black/25"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    </td>
                    <td className="px-3 py-2.5 font-medium text-[var(--ops-text)]">
                      {status.name}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-[var(--ops-text-secondary)]">
                      {status.slug}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[var(--ops-text-secondary)]">
                      {status.sort_order}
                    </td>
                    <td className="max-w-[220px] truncate px-3 py-2.5 text-[var(--ops-text-secondary)]">
                      {status.description ?? "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(status)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleDelete(status)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}
      </section>
    </div>
  );
}
