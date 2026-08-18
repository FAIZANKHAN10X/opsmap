"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import type { Point } from "@/lib/workspace-layout";
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
  /** Pending click-to-place world position; syncs Map X / Map Y when it changes. */
  placement?: Point | null;
};

/**
 * Property form (Phase 15) — basic property information plus the operational
 * data that drives the 8AM HUB KPIs and site map (capacity/placed/map_x/map_y).
 *
 * Business validation lives in the service layer
 * (`normalizeOperationalMetadata` in lib/server/validation.ts) and is not
 * duplicated here: non-empty operational values are passed through as-is and
 * the service coerces numeric strings / rejects invalid values with a 422.
 * Empty optional values are omitted so they stay empty rather than invalid.
 * Unrelated metadata keys are preserved by spreading `initial.metadata`.
 */
export function AssetForm({
  mode,
  projectId,
  initial,
  types,
  statuses,
  onSubmit,
  onCancel,
  placement,
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
  const [capacity, setCapacity] = useState(
    String(initial?.metadata.capacity ?? ""),
  );
  const [placed, setPlaced] = useState(
    String(initial?.metadata.placed ?? ""),
  );
  const [mapX, setMapX] = useState(
    String(initial?.metadata.map_x ?? ""),
  );
  const [mapY, setMapY] = useState(
    String(initial?.metadata.map_y ?? ""),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Click-to-place: sync Map X / Map Y from the pending placement. The canvas
  // emits world coordinates (CSS pixels); manual inputs remain the fallback.
  // React docs "adjusting state when a prop changes" pattern — sync only on
  // change, never overwriting a null/cleared placement.
  const [prevPlacement, setPrevPlacement] = useState<Point | null>(null);
  if (placement && placement !== prevPlacement) {
    setPrevPlacement(placement);
    const round = (value: number) => Math.round(value * 100) / 100;
    setMapX(String(round(placement.x)));
    setMapY(String(round(placement.y)));
  }

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

    // Start from the existing metadata so unrelated fields survive edits.
    const metadata: Record<string, unknown> = {
      ...(initial?.metadata ?? {}),
    };
    // Empty operational values are omitted; non-empty values pass through so
    // the service layer coerces numeric strings and rejects invalid ones.
    const setOperational = (key: string, value: string) => {
      const trimmed = value.trim();
      if (trimmed === "") {
        delete metadata[key];
      } else {
        metadata[key] = trimmed;
      }
    };
    setOperational("capacity", capacity);
    setOperational("placed", placed);
    setOperational("map_x", mapX);
    setOperational("map_y", mapY);

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
  const sectionClass =
    "border-t border-[var(--ops-border)] pt-4 first:border-t-0 first:pt-0";
  const sectionTitleClass =
    "mb-2 text-xs font-semibold tracking-wide text-[var(--ops-text-muted)] uppercase";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <section className={sectionClass}>
        <h3 className={sectionTitleClass}>Property</h3>
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
              placeholder="e.g. V-101"
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
        </div>
      </section>

      <section className={sectionClass}>
        <h3 className={sectionTitleClass}>Operational data</h3>
        <p className="mb-3 text-xs text-[var(--ops-text-muted)]">
          Capacity and placed drive the Dashboard KPIs; map coordinates place
          this property on the ULLUWATU &quot;26 site map.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className={labelClass}>Capacity</span>
            <input
              className={fieldClass}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              inputMode="numeric"
              placeholder="Max pax (e.g. 6)"
            />
          </label>
          <label>
            <span className={labelClass}>Placed</span>
            <input
              className={fieldClass}
              value={placed}
              onChange={(e) => setPlaced(e.target.value)}
              inputMode="numeric"
              placeholder="Pax placed (e.g. 4)"
            />
          </label>
          <label>
            <span className={labelClass}>Map X</span>
            <input
              className={fieldClass}
              value={mapX}
              onChange={(e) => setMapX(e.target.value)}
              inputMode="decimal"
              placeholder="e.g. 120"
            />
          </label>
          <label>
            <span className={labelClass}>Map Y</span>
            <input
              className={fieldClass}
              value={mapY}
              onChange={(e) => setMapY(e.target.value)}
              inputMode="decimal"
              placeholder="e.g. 80"
            />
          </label>
        </div>
      </section>

      <section className={sectionClass}>
        <h3 className={sectionTitleClass}>Details</h3>
        <div className="grid gap-3 sm:grid-cols-2">
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
        </div>
      </section>

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