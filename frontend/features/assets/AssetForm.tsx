"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import type {
  Asset,
  AssetCreateInput,
  AssetStatus,
  AssetType,
  AssetUpdateInput,
} from "@/types/domain";

type AssetFormProps = {
  mode: "create" | "edit";
  projectId: string;
  initial?: Asset | null;
  types: AssetType[];
  statuses: AssetStatus[];
  onSubmit: (payload: AssetCreateInput | AssetUpdateInput) => Promise<void>;
  onCancel: () => void;
};

export function AssetForm({
  mode,
  projectId,
  initial,
  types,
  statuses,
  onSubmit,
  onCancel,
}: AssetFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [owner, setOwner] = useState(initial?.owner ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [assigneesText, setAssigneesText] = useState(
    (initial?.assignees ?? []).join(", "),
  );
  const [typeId, setTypeId] = useState(initial?.asset_type_id ?? "");
  const [statusId, setStatusId] = useState(initial?.asset_status_id ?? "");
  const [mapX, setMapX] = useState(
    String(initial?.metadata.map_x ?? ""),
  );
  const [mapY, setMapY] = useState(
    String(initial?.metadata.map_y ?? ""),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    const assignees = assigneesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const metadata: Record<string, unknown> = {
      ...(initial?.metadata ?? {}),
    };
    const x = mapX.trim() === "" ? undefined : Number(mapX);
    const y = mapY.trim() === "" ? undefined : Number(mapY);
    if (x !== undefined && Number.isFinite(x)) metadata.map_x = x;
    else delete metadata.map_x;
    if (y !== undefined && Number.isFinite(y)) metadata.map_y = y;
    else delete metadata.map_y;

    const base = {
      name: name.trim(),
      code: code.trim() || null,
      description: description.trim() || null,
      owner: owner.trim() || null,
      notes: notes.trim() || null,
      assignees,
      asset_type_id: typeId || null,
      asset_status_id: statusId || null,
      metadata,
    };

    setSaving(true);
    try {
      if (mode === "create") {
        await onSubmit({ ...base, project_id: projectId });
      } else {
        await onSubmit(base);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    "mt-1 w-full rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-bg)] px-3 py-2 text-sm text-[var(--ops-text)] focus:border-[var(--ops-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--ops-accent)]";
  const labelClass = "block text-xs font-medium text-[var(--ops-text-muted)]";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className={labelClass}>Name *</span>
          <input
            className={fieldClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label>
          <span className={labelClass}>Code</span>
          <input
            className={fieldClass}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
        <label>
          <span className={labelClass}>Owner</span>
          <input
            className={fieldClass}
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="Primary owner"
          />
        </label>
        <label>
          <span className={labelClass}>Type</span>
          <select
            className={fieldClass}
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
          >
            <option value="">—</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelClass}>Status</span>
          <select
            className={fieldClass}
            value={statusId}
            onChange={(e) => setStatusId(e.target.value)}
          >
            <option value="">—</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-2">
          <span className={labelClass}>Assigned users</span>
          <input
            className={fieldClass}
            value={assigneesText}
            onChange={(e) => setAssigneesText(e.target.value)}
            placeholder="Comma-separated names"
          />
        </label>
        <label className="sm:col-span-2">
          <span className={labelClass}>Description</span>
          <textarea
            className={fieldClass}
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="sm:col-span-2">
          <span className={labelClass}>Notes</span>
          <textarea
            className={fieldClass}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <label>
          <span className={labelClass}>Map X</span>
          <input
            className={fieldClass}
            value={mapX}
            onChange={(e) => setMapX(e.target.value)}
            inputMode="decimal"
          />
        </label>
        <label>
          <span className={labelClass}>Map Y</span>
          <input
            className={fieldClass}
            value={mapY}
            onChange={(e) => setMapY(e.target.value)}
            inputMode="decimal"
          />
        </label>
      </div>

      {error ? (
        <p className="text-sm text-[var(--ops-danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Saving…" : mode === "create" ? "Create asset" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
