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

const FEATURE_OPTIONS = [
  "Pool",
  "Garden",
  "Balcony / Terrace",
  "Parking",
  "Ocean View",
  "Furnished",
  "Air Conditioning",
];

function metadataString(asset: Asset | null | undefined, key: string): string {
  const value = asset?.metadata?.[key];
  return typeof value === "string" ? value : "";
}

function metadataNumber(asset: Asset | null | undefined, key: string): string {
  const value = asset?.metadata?.[key];
  return (typeof value === "number" && Number.isFinite(value)) || (typeof value === "string" && value.trim() !== "")
    ? String(value)
    : "";
}

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
  // Basic information
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [typeId, setTypeId] = useState(initial?.asset_type_id ?? "");
  const [statusId, setStatusId] = useState(initial?.asset_status_id ?? "");
  const [address, setAddress] = useState(metadataString(initial, "address"));
  const [description, setDescription] = useState(initial?.description ?? "");

  // Property details
  const [bedrooms, setBedrooms] = useState(metadataNumber(initial, "bedrooms"));
  const [bathrooms, setBathrooms] = useState(
    metadataNumber(initial, "bathrooms"),
  );
  const [areaSqm, setAreaSqm] = useState(metadataNumber(initial, "area_sqm"));
  const [plotAreaSqm, setPlotAreaSqm] = useState(
    metadataNumber(initial, "plot_area_sqm"),
  );
  const [floor, setFloor] = useState(metadataString(initial, "floor"));
  const [parking, setParking] = useState(metadataNumber(initial, "parking"));
  const [furnishing, setFurnishing] = useState(
    metadataString(initial, "furnishing"),
  );
  const [view, setView] = useState(metadataString(initial, "view"));

  // Features
  const [featuresText, setFeaturesText] = useState(() => {
    const features = initial?.metadata?.features;
    return Array.isArray(features)
      ? features.map((f) => String(f)).join(", ")
      : "";
  });

  // Operations
  const [capacity, setCapacity] = useState(() => {
    if (initial?.metadata?.capacity) return String(initial.metadata.capacity);
    if (initial?.metadata?.pax) return String(initial.metadata.pax);
    return "";
  });
  const [placed, setPlaced] = useState(metadataNumber(initial, "placed"));
  const [notes, setNotes] = useState(initial?.notes ?? "");

  // Location
  const [mapX, setMapX] = useState(metadataNumber(initial, "map_x"));
  const [mapY, setMapY] = useState(metadataNumber(initial, "map_y"));

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

    const metadata: Record<string, unknown> = {
      ...initial?.metadata,
    };
    if (address.trim()) metadata.address = address.trim();
    else delete metadata.address;

    if (bedrooms.trim()) metadata.bedrooms = Number(bedrooms);
    else delete metadata.bedrooms;
    if (bathrooms.trim()) metadata.bathrooms = Number(bathrooms);
    else delete metadata.bathrooms;
    if (areaSqm.trim()) metadata.area_sqm = Number(areaSqm);
    else delete metadata.area_sqm;
    if (plotAreaSqm.trim()) metadata.plot_area_sqm = Number(plotAreaSqm);
    else delete metadata.plot_area_sqm;
    if (floor.trim()) metadata.floor = floor.trim();
    else delete metadata.floor;
    if (parking.trim()) metadata.parking = Number(parking);
    else delete metadata.parking;
    if (furnishing.trim()) metadata.furnishing = furnishing.trim();
    else delete metadata.furnishing;
    if (view.trim()) metadata.view = view.trim();
    else delete metadata.view;

    const features = featuresText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (features.length > 0) metadata.features = features;
    else delete metadata.features;

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
      notes: notes.trim() || null,
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

  function toggleFeature(feature: string) {
    const current = new Set(
      featuresText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
    if (current.has(feature)) current.delete(feature);
    else current.add(feature);
    setFeaturesText(Array.from(current).join(", "));
  }

  const activeFeatures = new Set(
    featuresText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-6">
      <section className={sectionClass}>
        <h3 className={sectionTitleClass}>Basic Information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className={labelClass}>Property name *</span>
            <input
              className={fieldClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Villa 14"
              required
            />
          </label>
          <label>
            <span className={labelClass}>Property type</span>
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
            <span className={labelClass}>Property status</span>
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
          <label>
            <span className={labelClass}>Unit / Villa No.</span>
            <input
              className={fieldClass}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. V-101"
            />
          </label>
          <label>
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
        <h3 className={sectionTitleClass}>Property Details</h3>
        <p className="-mt-3 mb-4 text-[13px] text-[var(--ops-text-muted)]">
          Optional — you can add these later.
        </p>
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
              inputMode="decimal"
              placeholder="e.g. 2.5"
            />
          </label>
          <label>
            <span className={labelClass}>Built-up area (sqm)</span>
            <input
              className={fieldClass}
              value={areaSqm}
              onChange={(e) => setAreaSqm(e.target.value)}
              inputMode="decimal"
              placeholder="e.g. 148"
            />
          </label>
          <label>
            <span className={labelClass}>Plot area (sqm)</span>
            <input
              className={fieldClass}
              value={plotAreaSqm}
              onChange={(e) => setPlotAreaSqm(e.target.value)}
              inputMode="decimal"
              placeholder="e.g. 300"
            />
          </label>
          <label>
            <span className={labelClass}>Parking spaces</span>
            <input
              className={fieldClass}
              value={parking}
              onChange={(e) => setParking(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 2"
            />
          </label>
          <label>
            <span className={labelClass}>Furnishing</span>
            <select
              className={fieldClass}
              value={furnishing}
              onChange={(e) => setFurnishing(e.target.value)}
            >
              <option value="">—</option>
              <option value="unfurnished">Unfurnished</option>
              <option value="semi-furnished">Semi-furnished</option>
              <option value="fully-furnished">Fully furnished</option>
            </select>
          </label>
          <label>
            <span className={labelClass}>View</span>
            <input
              className={fieldClass}
              value={view}
              onChange={(e) => setView(e.target.value)}
              placeholder="e.g. Ocean view"
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
        <h3 className={sectionTitleClass}>Features</h3>
        <div className="mb-4 flex flex-wrap gap-2">
          {FEATURE_OPTIONS.map((feature) => {
            const active = activeFeatures.has(feature);
            return (
              <button
                key={feature}
                type="button"
                onClick={() => toggleFeature(feature)}
                aria-pressed={active}
                className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                  active
                    ? "border-transparent bg-[var(--ops-accent)] text-white shadow-sm"
                    : "border-[var(--ops-border-subtle)] bg-[var(--ops-surface-hover)] text-[var(--ops-text-secondary)] hover:border-[var(--ops-accent)]/40"
                }`}
              >
                {feature}
              </button>
            );
          })}
        </div>
        <label>
          <span className={labelClass}>Other features (comma-separated)</span>
          <input
            className={fieldClass}
            value={Array.from(activeFeatures)
              .filter((f) => !FEATURE_OPTIONS.includes(f))
              .join(", ")}
            onChange={(e) => {
              const presets = Array.from(activeFeatures).filter((f) =>
                FEATURE_OPTIONS.includes(f),
              );
              const custom = e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              setFeaturesText([...presets, ...custom].join(", "));
            }}
            placeholder="e.g. Rooftop lounge, Staff quarters"
          />
        </label>
      </section>

      <section className={sectionClass}>
        <h3 className={sectionTitleClass}>Operations</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className={labelClass}>Capacity (max pax)</span>
            <input
              className={fieldClass}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 6"
            />
          </label>
          <label>
            <span className={labelClass}>Placed (pax)</span>
            <input
              className={fieldClass}
              value={placed}
              onChange={(e) => setPlaced(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 4"
            />
          </label>
          <label className="sm:col-span-2">
            <span className={labelClass}>Internal notes</span>
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
            Click the property map to place this property. Drag is not required — click again to move the marker.
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
