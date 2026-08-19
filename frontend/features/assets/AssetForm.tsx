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
  /** Pending click-to-place world position; syncs plan coordinates when it changes. */
  placement?: Point | null;
};

/**
 * Owner-facing property editor. Operational coordinates stay in metadata
 * (`map_x`/`map_y`) but the primary UX is "place on the plan".
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
  const [address, setAddress] = useState(
    String(initial?.metadata.address ?? ""),
  );
  const [bedrooms, setBedrooms] = useState(
    String(initial?.metadata.bedrooms ?? ""),
  );
  const [bathrooms, setBathrooms] = useState(
    String(initial?.metadata.bathrooms ?? ""),
  );
  const [areaSqm, setAreaSqm] = useState(
    String(initial?.metadata.area_sqm ?? ""),
  );
  const [floor, setFloor] = useState(String(initial?.metadata.floor ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [prevPlacement, setPrevPlacement] = useState<Point | null>(null);
  if (placement && placement !== prevPlacement) {
    setPrevPlacement(placement);
    const round = (value: number) => Math.round(value * 100) / 100;
    setMapX(String(round(placement.x)));
    setMapY(String(round(placement.y)));
  }

  const isPlaced = mapX.trim() !== "" && mapY.trim() !== "";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (mode === "create" && !projectId) {
      setError("Select a development before creating a property.");
      return;
    }

    const assignees = assigneesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const metadata: Record<string, unknown> = {
      ...(initial?.metadata ?? {}),
    };
    const setMeta = (key: string, value: string) => {
      const trimmed = value.trim();
      if (trimmed === "") {
        delete metadata[key];
      } else {
        metadata[key] = trimmed;
      }
    };
    setMeta("capacity", capacity);
    setMeta("placed", placed);
    setMeta("map_x", mapX);
    setMeta("map_y", mapY);
    setMeta("address", address);
    setMeta("bedrooms", bedrooms);
    setMeta("bathrooms", bathrooms);
    setMeta("area_sqm", areaSqm);
    setMeta("floor", floor);

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
            <span className={labelClass}>Address</span>
            <input
              className={fieldClass}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Property address"
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
        </div>
      </section>

      <section className={sectionClass}>
        <h3 className={sectionTitleClass}>Characteristics</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className={labelClass}>Bedrooms</span>
            <input
              className={fieldClass}
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 3"
            />
          </label>
          <label>
            <span className={labelClass}>Bathrooms</span>
            <input
              className={fieldClass}
              value={bathrooms}
              onChange={(e) => setBathrooms(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 2"
            />
          </label>
          <label>
            <span className={labelClass}>Area (sqm)</span>
            <input
              className={fieldClass}
              value={areaSqm}
              onChange={(e) => setAreaSqm(e.target.value)}
              inputMode="decimal"
              placeholder="e.g. 148"
            />
          </label>
          <label>
            <span className={labelClass}>Floor</span>
            <input
              className={fieldClass}
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              placeholder="e.g. Ground"
            />
          </label>
        </div>
      </section>

      <section className={sectionClass}>
        <h3 className={sectionTitleClass}>Operations</h3>
        <p className="mb-3 text-xs text-[var(--ops-text-muted)]">
          Capacity and placed drive the Dashboard KPIs.
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
            <span className={labelClass}>Owner</span>
            <input
              className={fieldClass}
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Primary owner"
            />
          </label>
          <label>
            <span className={labelClass}>Assignees</span>
            <input
              className={fieldClass}
              value={assigneesText}
              onChange={(e) => setAssigneesText(e.target.value)}
              placeholder="Comma-separated names"
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

      <section className={sectionClass}>
        <h3 className={sectionTitleClass}>Location</h3>
        <p className="text-sm text-[var(--ops-text)]">
          {isPlaced ? "Placed on the plan." : "Not placed on the plan."}
        </p>
        <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
          Click the property map to place this villa. Drag is not required —
          click again to move the marker, then save.
        </p>
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-[var(--ops-text-muted)]">
            Advanced coordinates
          </summary>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
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
        </details>
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
          {saving ? "Saving…" : mode === "create" ? "Create property" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
