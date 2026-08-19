"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import type {
  Asset,
  AssetCreateInput,
  AssetStatus,
  AssetType,
  AssetUpdateInput,
} from "@/types/domain";

type FormMode = "create" | "edit";
type Point = { x: number; y: number };

type AssetFormProps = {
  mode: FormMode;
  projectId: string;
  initial?: Asset | null;
  types: AssetType[];
  statuses: AssetStatus[];
  onSubmit: (payload: AssetCreateInput | AssetUpdateInput) => Promise<void>;
  onCancel: () => void;
  placement?: Point | null;
};

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
  const [typeId, setTypeId] = useState(initial?.asset_type_id ?? "");
  const [statusId, setStatusId] = useState(initial?.asset_status_id ?? "");
  const [owner, setOwner] = useState(initial?.owner ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [assigneesText, setAssigneesText] = useState(
    initial?.assignees?.join(", ") ?? "",
  );

  const [address, setAddress] = useState(
    (initial?.metadata?.address as string | undefined) ?? "",
  );
  const [bedrooms, setBedrooms] = useState(
    initial?.metadata?.bedrooms ? String(initial.metadata.bedrooms) : "",
  );
  const [bathrooms, setBathrooms] = useState(
    initial?.metadata?.bathrooms ? String(initial.metadata.bathrooms) : "",
  );
  const [areaSqm, setAreaSqm] = useState(
    initial?.metadata?.area_sqm ? String(initial.metadata.area_sqm) : "",
  );
  const [floor, setFloor] = useState(
    (initial?.metadata?.floor as string | undefined) ?? "",
  );

  const [capacity, setCapacity] = useState(
    initial?.metadata?.capacity
      ? String(initial.metadata.capacity)
      : initial?.metadata?.pax
        ? String(initial.metadata.pax)
        : "",
  );
  const [placed, setPlaced] = useState(
    initial?.metadata?.placed ? String(initial.metadata.placed) : "",
  );

  const [mapX, setMapX] = useState(
    initial?.metadata?.map_x ? String(initial.metadata.map_x) : "",
  );
  const [mapY, setMapY] = useState(
    initial?.metadata?.map_y ? String(initial.metadata.map_y) : "",
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (placement) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMapX(placement.x.toString());
      setMapY(placement.y.toString());
    }
  }, [placement]);

  const isPlaced = mapX.trim() !== "" && mapY.trim() !== "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const assignees = assigneesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const metadata: Record<string, unknown> = {
      ...initial?.metadata,
    };
    if (address.trim()) metadata.address = address.trim();
    if (bedrooms.trim()) metadata.bedrooms = Number(bedrooms);
    if (bathrooms.trim()) metadata.bathrooms = Number(bathrooms);
    if (areaSqm.trim()) metadata.area_sqm = Number(areaSqm);
    if (floor.trim()) metadata.floor = floor.trim();

    if (capacity.trim()) metadata.capacity = Number(capacity);
    else delete metadata.capacity;
    if (placed.trim()) metadata.placed = Number(placed);
    else delete metadata.placed;

    if (mapX.trim() && !Number.isNaN(Number(mapX)))
      metadata.map_x = Number(mapX);
    else delete metadata.map_x;

    if (mapY.trim() && !Number.isNaN(Number(mapY)))
      metadata.map_y = Number(mapY);
    else delete metadata.map_y;

    const payload: AssetCreateInput = {
      project_id: projectId,
      asset_type_id: typeId || null,
      asset_status_id: statusId || null,
      name: name.trim(),
      code: code.trim() || null,
      description: description.trim() || null,
      owner: owner.trim() || null,
      notes: notes.trim() || null,
      assignees,
      metadata,
    };

    try {
      await onSubmit(payload);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
      setSaving(false);
    }
  }

  const fieldClass =
    "mt-1.5 w-full rounded-[var(--ops-radius-lg)] border border-transparent bg-[var(--ops-surface-hover)] px-4 py-2.5 text-[14px] text-[var(--ops-text)] placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-border-subtle)] focus:bg-[var(--ops-surface)] focus:outline-none focus:ring-4 focus:ring-[var(--ops-accent-muted)] transition-all";
  const labelClass = "block text-[13px] font-semibold text-[var(--ops-text-secondary)]";
  const sectionClass =
    "border border-[var(--ops-border-subtle)] rounded-[var(--ops-radius-xl)] p-5 shadow-sm bg-[var(--ops-surface)]";
  const sectionTitleClass =
    "mb-4 text-[16px] font-bold text-[var(--ops-text)]";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-6">
      <section className={sectionClass}>
        <h3 className={sectionTitleClass}>Property</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className={labelClass}>Name *</span>
            <input
              className={fieldClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Villa 14"
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
              placeholder="Full property address"
            />
          </label>
          <label className="sm:col-span-2">
            <span className={labelClass}>Description</span>
            <textarea
              className={fieldClass}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details about this property..."
            />
          </label>
        </div>
      </section>

      <section className={sectionClass}>
        <h3 className={sectionTitleClass}>Characteristics</h3>
        <div className="grid gap-4 sm:grid-cols-2">
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
        <div className="grid gap-4 sm:grid-cols-2">
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
              placeholder="Operational notes..."
            />
          </label>
        </div>
      </section>

      <section className={sectionClass}>
        <h3 className={sectionTitleClass}>Location</h3>
        <div className="bg-[var(--ops-info-muted)] border border-[var(--ops-info)]/20 rounded-[var(--ops-radius-lg)] p-4 flex flex-col gap-2">
          <p className="text-[14px] font-semibold text-[var(--ops-text)]">
            {isPlaced ? "Placed on the plan." : "Not placed on the plan."}
          </p>
          <p className="text-[13px] text-[var(--ops-text-secondary)]">
            Click the property map to place this villa. Drag is not required — click again to move the marker.
          </p>
        </div>
        <details className="mt-4 group">
          <summary className="cursor-pointer text-[13px] font-semibold text-[var(--ops-text-muted)] hover:text-[var(--ops-text)] transition-colors inline-flex items-center gap-1.5 select-none">
            Advanced coordinates
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 pt-2 border-t border-[var(--ops-border-subtle)]">
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
        <p className="text-[14px] font-medium text-[var(--ops-danger)] bg-[var(--ops-danger-muted)] p-3 rounded-[var(--ops-radius-lg)]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-3 pt-2 sticky bottom-0 bg-[var(--ops-bg)] py-4 border-t border-[var(--ops-border-subtle)] -mx-6 px-6 -mb-6 mt-6 z-10">
        <Button type="button" variant="secondary" size="lg" onClick={onCancel} disabled={saving} className="rounded-full shadow-sm">
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="lg" disabled={saving} className="rounded-full shadow-sm px-8">
          {saving ? "Saving…" : mode === "create" ? "Create Property" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
