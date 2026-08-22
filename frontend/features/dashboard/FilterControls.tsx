"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { statusColor } from "@/lib/status-colors";
import { useShell } from "@/stores/shell-context";
import type { AssetStatus, AssetType } from "@/types/domain";

type FilterControlsProps = {
  statuses: AssetStatus[];
  types: AssetType[];
  total?: number;
  loading?: boolean;
};

const FEATURE_OPTIONS = [
  "Pool",
  "Garden",
  "Balcony",
  "Parking",
  "Ocean View",
  "Furnished",
  "Air Conditioning",
  "Gym",
  "Kitchen",
  "Wi-Fi",
];

const FURNISHING_OPTIONS = [
  { value: "", label: "Any furnishing" },
  { value: "unfurnished", label: "Unfurnished" },
  { value: "semi-furnished", label: "Semi-furnished" },
  { value: "fully-furnished", label: "Fully furnished" },
];

const CURRENCIES = ["IDR", "USD", "EUR", "AUD", "SGD", "GBP", "JPY"];

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  onClose: () => void,
  open: boolean,
) {
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onClose, open]);
}

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[var(--ops-border)] bg-[var(--ops-surface)] px-2.5 text-xs font-medium text-[var(--ops-text)]">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10"
      >
        <Icon name="x" size={12} />
      </button>
    </span>
  );
}

export function FilterControls({ statuses, types }: FilterControlsProps) {
  const {
    filters,
    setSearch,
    toggleStatusFilter,
    toggleTypeFilter,
    setPlacementFilter,
    setPriceFilter,
    setBedsBathsFilter,
    setAreaFilter,
    setFurnishingFilter,
    toggleFeatureFilter,
    removeFilter,
    clearFilters,
  } = useShell();

  const [typeOpen, setTypeOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [bedsOpen, setBedsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const typeRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const priceRef = useRef<HTMLDivElement>(null);
  const bedsRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  useClickOutside(typeRef, () => setTypeOpen(false), typeOpen);
  useClickOutside(statusRef, () => setStatusOpen(false), statusOpen);
  useClickOutside(priceRef, () => setPriceOpen(false), priceOpen);
  useClickOutside(bedsRef, () => setBedsOpen(false), bedsOpen);
  useClickOutside(moreRef, () => setMoreOpen(false), moreOpen);

  // Price local state — sync when external filters change (clear/remote)
  const [priceMinInput, setPriceMinInput] = useState(filters.priceMin?.toString() ?? "");
  const [priceMaxInput, setPriceMaxInput] = useState(filters.priceMax?.toString() ?? "");
  const [currencyInput, setCurrencyInput] = useState(filters.currency ?? "");
  useEffect(() => {
    setPriceMinInput(filters.priceMin?.toString() ?? "");
    setPriceMaxInput(filters.priceMax?.toString() ?? "");
    setCurrencyInput(filters.currency ?? "");
  }, [filters.priceMin, filters.priceMax, filters.currency]);

  // Beds/baths/area local — sync when external filters change
  const [bedsInput, setBedsInput] = useState(filters.bedroomsMin?.toString() ?? "");
  const [bathsInput, setBathsInput] = useState(filters.bathroomsMin?.toString() ?? "");
  const [areaMinInput, setAreaMinInput] = useState(filters.areaMin?.toString() ?? "");
  const [areaMaxInput, setAreaMaxInput] = useState(filters.areaMax?.toString() ?? "");
  useEffect(() => {
    setBedsInput(filters.bedroomsMin?.toString() ?? "");
    setBathsInput(filters.bathroomsMin?.toString() ?? "");
    setAreaMinInput(filters.areaMin?.toString() ?? "");
    setAreaMaxInput(filters.areaMax?.toString() ?? "");
  }, [filters.bedroomsMin, filters.bathroomsMin, filters.areaMin, filters.areaMax]);

  const hasFilters =
    filters.statusSlugs.length > 0 ||
    filters.typeSlugs.length > 0 ||
    Boolean(filters.placement) ||
    filters.search.trim().length > 0 ||
    filters.priceMin != null ||
    filters.priceMax != null ||
    Boolean(filters.currency) ||
    filters.bedroomsMin != null ||
    filters.bathroomsMin != null ||
    filters.areaMin != null ||
    filters.areaMax != null ||
    Boolean(filters.furnishing) ||
    (filters.features && filters.features.length > 0);

  const hasMoreFilters =
    filters.placement != null ||
    Boolean(filters.furnishing) ||
    (filters.features && filters.features.length > 0);

  const activePrice = filters.priceMin != null || filters.priceMax != null || Boolean(filters.currency);
  const activeBeds = filters.bedroomsMin != null || filters.bathroomsMin != null || filters.areaMin != null || filters.areaMax != null;

  function formatPriceRange(): string {
    if (filters.priceMin != null && filters.priceMax != null) {
      return `${filters.currency ?? ""} ${filters.priceMin.toLocaleString()}–${filters.priceMax.toLocaleString()}`.trim();
    }
    if (filters.priceMin != null) return `${filters.currency ?? ""} ≥${filters.priceMin.toLocaleString()}`.trim();
    if (filters.priceMax != null) return `${filters.currency ?? ""} ≤${filters.priceMax.toLocaleString()}`.trim();
    if (filters.currency) return filters.currency;
    return "";
  }

  return (
    <div className="flex flex-col gap-3 rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] bg-[var(--ops-surface)] p-3 shadow-[var(--ops-shadow-sm)]">
      {/* Search + primary filters row */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {/* Search */}
        <label className="relative flex-1">
          <span className="sr-only">Search properties</span>
          <Icon
            name="search"
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--ops-text-muted)]"
          />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search properties, code, address, description…"
            className="h-10 w-full rounded-full border border-[var(--ops-border)] bg-[var(--ops-bg)] py-2 pr-3 pl-9 text-sm text-[var(--ops-text)] placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ops-accent)]/20"
          />
        </label>

        {/* Primary filter pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type */}
          <div ref={typeRef} className="relative">
            <button
              type="button"
              onClick={() => setTypeOpen((v) => !v)}
              aria-expanded={typeOpen}
              aria-haspopup="dialog"
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
                filters.typeSlugs.length > 0
                  ? "border-[var(--ops-accent)] bg-[var(--ops-accent)] text-white"
                  : "border-[var(--ops-border)] bg-white text-[var(--ops-text)] hover:border-[var(--ops-border-strong)]",
              )}
            >
              Type{filters.typeSlugs.length > 0 ? ` · ${filters.typeSlugs.length}` : ""}
              <Icon name={typeOpen ? "chevron-up" : "chevron-down"} size={14} />
            </button>
            {typeOpen ? (
              <div
                role="dialog"
                aria-label="Filter by property type"
                className="absolute left-0 z-30 mt-2 w-64 rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-surface)] p-3 shadow-lg"
              >
                {types.length === 0 ? (
                  <p className="text-sm text-[var(--ops-text-muted)]">No types</p>
                ) : (
                  <div className="space-y-1.5">
                    {types.map((t) => {
                      const active = filters.typeSlugs.includes(t.slug);
                      return (
                        <label
                          key={t.id}
                          className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--ops-surface-hover)]"
                        >
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => toggleTypeFilter(t.slug)}
                            className="h-4 w-4 rounded border-[var(--ops-border)] text-[var(--ops-accent)] focus:ring-[var(--ops-accent)]"
                          />
                          <span className="text-sm text-[var(--ops-text)]">{t.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                <div className="mt-3 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setTypeOpen(false)}>
                    Done
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Status */}
          <div ref={statusRef} className="relative">
            <button
              type="button"
              onClick={() => setStatusOpen((v) => !v)}
              aria-expanded={statusOpen}
              aria-haspopup="dialog"
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
                filters.statusSlugs.length > 0
                  ? "border-[var(--ops-accent)] bg-[var(--ops-accent)] text-white"
                  : "border-[var(--ops-border)] bg-white text-[var(--ops-text)] hover:border-[var(--ops-border-strong)]",
              )}
            >
              Status{filters.statusSlugs.length > 0 ? ` · ${filters.statusSlugs.length}` : ""}
              <Icon name={statusOpen ? "chevron-up" : "chevron-down"} size={14} />
            </button>
            {statusOpen ? (
              <div
                role="dialog"
                aria-label="Filter by status"
                className="absolute left-0 z-30 mt-2 w-64 rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-surface)] p-3 shadow-lg"
              >
                <div className="space-y-1.5">
                  {statuses.map((s) => {
                    const active = filters.statusSlugs.includes(s.slug);
                    const color = statusColor(s.slug, s.color);
                    return (
                      <label
                        key={s.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--ops-surface-hover)]"
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleStatusFilter(s.slug)}
                          className="h-4 w-4 rounded border-[var(--ops-border)] text-[var(--ops-accent)] focus:ring-[var(--ops-accent)]"
                        />
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-sm text-[var(--ops-text)]">{s.name}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-3 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setStatusOpen(false)}>
                    Done
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Price */}
          <div ref={priceRef} className="relative">
            <button
              type="button"
              onClick={() => setPriceOpen((v) => !v)}
              aria-expanded={priceOpen}
              aria-haspopup="dialog"
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
                activePrice
                  ? "border-[var(--ops-accent)] bg-[var(--ops-accent)] text-white"
                  : "border-[var(--ops-border)] bg-white text-[var(--ops-text)] hover:border-[var(--ops-border-strong)]",
              )}
            >
              Price
              {activePrice ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
              <Icon name={priceOpen ? "chevron-up" : "chevron-down"} size={14} />
            </button>
            {priceOpen ? (
              <div
                role="dialog"
                aria-label="Price filter"
                className="absolute left-0 z-30 mt-2 w-80 rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-surface)] p-4 shadow-lg"
              >
                <p className="mb-3 text-sm font-semibold text-[var(--ops-text)]">Price</p>
                <label className="mb-3 block">
                  <span className="mb-1 block text-xs font-medium text-[var(--ops-text-muted)]">Currency</span>
                  <select
                    value={currencyInput}
                    onChange={(e) => setCurrencyInput(e.target.value)}
                    className="h-9 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm focus:border-[var(--ops-accent)] focus:outline-none"
                  >
                    <option value="">Any currency</option>
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label>
                    <span className="mb-1 block text-xs font-medium text-[var(--ops-text-muted)]">Min</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="Min price"
                      value={priceMinInput}
                      onChange={(e) => setPriceMinInput(e.target.value)}
                      className="h-9 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm focus:border-[var(--ops-accent)] focus:outline-none"
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-medium text-[var(--ops-text-muted)]">Max</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="Max price"
                      value={priceMaxInput}
                      onChange={(e) => setPriceMaxInput(e.target.value)}
                      className="h-9 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm focus:border-[var(--ops-accent)] focus:outline-none"
                    />
                  </label>
                </div>
                <div className="mt-4 flex justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPriceMinInput("");
                      setPriceMaxInput("");
                      setCurrencyInput("");
                      setPriceFilter(null, null, "");
                      setPriceOpen(false);
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const min = priceMinInput.trim() ? Number(priceMinInput) : null;
                      const max = priceMaxInput.trim() ? Number(priceMaxInput) : null;
                      setPriceFilter(
                        min != null && Number.isFinite(min) ? min : null,
                        max != null && Number.isFinite(max) ? max : null,
                        currencyInput || null,
                      );
                      setPriceOpen(false);
                    }}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Beds & Baths */}
          <div ref={bedsRef} className="relative">
            <button
              type="button"
              onClick={() => setBedsOpen((v) => !v)}
              aria-expanded={bedsOpen}
              aria-haspopup="dialog"
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
                activeBeds
                  ? "border-[var(--ops-accent)] bg-[var(--ops-accent)] text-white"
                  : "border-[var(--ops-border)] bg-white text-[var(--ops-text)] hover:border-[var(--ops-border-strong)]",
              )}
            >
              Beds & Baths
              {activeBeds ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
              <Icon name={bedsOpen ? "chevron-up" : "chevron-down"} size={14} />
            </button>
            {bedsOpen ? (
              <div
                role="dialog"
                aria-label="Bedrooms, bathrooms and area"
                className="absolute left-0 z-30 mt-2 w-80 rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-surface)] p-4 shadow-lg"
              >
                <p className="mb-3 text-sm font-semibold text-[var(--ops-text)]">Beds, Baths & Area</p>
                <div className="grid grid-cols-2 gap-3">
                  <label>
                    <span className="mb-1 block text-xs font-medium text-[var(--ops-text-muted)]">Min bedrooms</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="Any"
                      value={bedsInput}
                      onChange={(e) => setBedsInput(e.target.value)}
                      className="h-9 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm focus:border-[var(--ops-accent)] focus:outline-none"
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-medium text-[var(--ops-text-muted)]">Min bathrooms</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="Any"
                      value={bathsInput}
                      onChange={(e) => setBathsInput(e.target.value)}
                      className="h-9 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm focus:border-[var(--ops-accent)] focus:outline-none"
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-medium text-[var(--ops-text-muted)]">Min area (m²)</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="Any"
                      value={areaMinInput}
                      onChange={(e) => setAreaMinInput(e.target.value)}
                      className="h-9 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm focus:border-[var(--ops-accent)] focus:outline-none"
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-medium text-[var(--ops-text-muted)]">Max area (m²)</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="Any"
                      value={areaMaxInput}
                      onChange={(e) => setAreaMaxInput(e.target.value)}
                      className="h-9 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm focus:border-[var(--ops-accent)] focus:outline-none"
                    />
                  </label>
                </div>
                <div className="mt-4 flex justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setBedsInput("");
                      setBathsInput("");
                      setAreaMinInput("");
                      setAreaMaxInput("");
                      setBedsBathsFilter(null, null);
                      setAreaFilter(null, null);
                      setBedsOpen(false);
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const beds = bedsInput.trim() ? Number(bedsInput) : null;
                      const baths = bathsInput.trim() ? Number(bathsInput) : null;
                      const aMin = areaMinInput.trim() ? Number(areaMinInput) : null;
                      const aMax = areaMaxInput.trim() ? Number(areaMaxInput) : null;
                      setBedsBathsFilter(
                        beds != null && Number.isFinite(beds) ? beds : null,
                        baths != null && Number.isFinite(baths) ? baths : null,
                      );
                      setAreaFilter(
                        aMin != null && Number.isFinite(aMin) ? aMin : null,
                        aMax != null && Number.isFinite(aMax) ? aMax : null,
                      );
                      setBedsOpen(false);
                    }}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          {/* More Filters */}
          <div ref={moreRef} className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
                hasMoreFilters
                  ? "border-[var(--ops-accent)] bg-[var(--ops-accent)] text-white"
                  : "border-[var(--ops-border)] bg-white text-[var(--ops-text)] hover:border-[var(--ops-border-strong)]",
              )}
            >
              <Icon name="filter" size={14} />
              More Filters
              {hasMoreFilters ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
            </button>
            {moreOpen ? (
              <>
                {/* Desktop popover */}
                <div
                  role="dialog"
                  aria-label="More filters"
                  className="absolute right-0 z-30 mt-2 hidden w-80 rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-surface)] p-4 shadow-lg lg:block"
                >
                  <MoreFiltersContent
                    filters={filters}
                    setPlacementFilter={setPlacementFilter}
                    setFurnishingFilter={setFurnishingFilter}
                    toggleFeatureFilter={toggleFeatureFilter}
                    onClose={() => setMoreOpen(false)}
                  />
                </div>
                {/* Mobile drawer overlay */}
                <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 lg:hidden">
                  <div
                    role="dialog"
                    aria-label="More filters"
                    className="max-h-[80vh] w-full overflow-y-auto rounded-t-[var(--ops-radius-xl)] border border-[var(--ops-border)] bg-[var(--ops-surface)] p-4 shadow-xl"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-base font-semibold text-[var(--ops-text)]">More Filters</p>
                      <Button variant="ghost" size="icon-sm" onClick={() => setMoreOpen(false)} aria-label="Close">
                        <Icon name="x" size={16} />
                      </Button>
                    </div>
                    <MoreFiltersContent
                      filters={filters}
                      setPlacementFilter={setPlacementFilter}
                      setFurnishingFilter={setFurnishingFilter}
                      toggleFeatureFilter={toggleFeatureFilter}
                      onClose={() => setMoreOpen(false)}
                    />
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Active filter chips */}
      {hasFilters ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--ops-border-subtle)] pt-3">
          <span className="text-xs font-medium text-[var(--ops-text-muted)]">Active:</span>
          <div className="flex flex-wrap gap-1.5">
            {filters.search.trim() ? (
              <FilterChip label={`“${filters.search.trim()}”`} onRemove={() => removeFilter("search")} />
            ) : null}
            {filters.typeSlugs.map((slug) => {
              const name = types.find((t) => t.slug === slug)?.name ?? slug;
              return <FilterChip key={`type-${slug}`} label={name} onRemove={() => removeFilter("type", slug)} />;
            })}
            {filters.statusSlugs.map((slug) => {
              const name = statuses.find((s) => s.slug === slug)?.name ?? slug;
              return <FilterChip key={`status-${slug}`} label={name} onRemove={() => removeFilter("status", slug)} />;
            })}
            {filters.placement ? (
              <FilterChip
                label={filters.placement === "placed" ? "Placed" : "Unplaced"}
                onRemove={() => removeFilter("placement")}
              />
            ) : null}
            {activePrice ? (
              <FilterChip label={formatPriceRange() || "Price"} onRemove={() => removeFilter("price")} />
            ) : null}
            {filters.bedroomsMin != null ? (
              <FilterChip label={`${filters.bedroomsMin}+ beds`} onRemove={() => removeFilter("bedrooms")} />
            ) : null}
            {filters.bathroomsMin != null ? (
              <FilterChip label={`${filters.bathroomsMin}+ baths`} onRemove={() => removeFilter("bathrooms")} />
            ) : null}
            {filters.areaMin != null || filters.areaMax != null ? (
              <FilterChip
                label={
                  filters.areaMin != null && filters.areaMax != null
                    ? `${filters.areaMin}–${filters.areaMax} m²`
                    : filters.areaMin != null
                      ? `≥${filters.areaMin} m²`
                      : `≤${filters.areaMax} m²`
                }
                onRemove={() => removeFilter("area")}
              />
            ) : null}
            {filters.furnishing ? (
              <FilterChip label={filters.furnishing} onRemove={() => removeFilter("furnishing")} />
            ) : null}
            {(filters.features ?? []).map((f) => (
              <FilterChip key={`feat-${f}`} label={f} onRemove={() => removeFilter("features", f)} />
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto">
            Clear all
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function MoreFiltersContent({
  filters,
  setPlacementFilter,
  setFurnishingFilter,
  toggleFeatureFilter,
  onClose,
}: {
  filters: {
    placement?: "placed" | "unplaced" | null;
    furnishing?: string | null;
    features?: string[];
  };
  setPlacementFilter: (v: "placed" | "unplaced" | null) => void;
  setFurnishingFilter: (v: string | null) => void;
  toggleFeatureFilter: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-semibold text-[var(--ops-text)]">Placement</p>
        <div className="flex overflow-hidden rounded-full border border-[var(--ops-border)] p-0.5">
          {[
            { value: null, label: "All" },
            { value: "placed" as const, label: "Placed" },
            { value: "unplaced" as const, label: "Unplaced" },
          ].map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              aria-pressed={(filters.placement ?? null) === opt.value}
              onClick={() => setPlacementFilter(opt.value)}
              className={cn(
                "flex-1 h-8 rounded-full text-xs font-semibold transition-colors",
                (filters.placement ?? null) === opt.value
                  ? "bg-[var(--ops-accent)] text-white shadow-sm"
                  : "text-[var(--ops-text-secondary)] hover:text-[var(--ops-text)]",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-[var(--ops-text)]">Furnishing</label>
        <select
          value={filters.furnishing ?? ""}
          onChange={(e) => setFurnishingFilter(e.target.value || null)}
          className="h-9 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm focus:border-[var(--ops-accent)] focus:outline-none"
        >
          {FURNISHING_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-[var(--ops-text)]">Features</p>
        <div className="flex flex-wrap gap-1.5">
          {FEATURE_OPTIONS.map((feat) => {
            const active = (filters.features ?? []).includes(feat);
            return (
              <button
                key={feat}
                type="button"
                aria-pressed={active}
                onClick={() => toggleFeatureFilter(feat)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-[var(--ops-accent)] bg-[var(--ops-accent)] text-white"
                    : "border-[var(--ops-border)] bg-white text-[var(--ops-text-secondary)] hover:border-[var(--ops-border-strong)]",
                )}
              >
                {feat}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}
