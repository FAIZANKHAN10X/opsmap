"use client";

import { cn } from "@/lib/cn";
import { statusColor } from "@/lib/status-colors";
import type { Point } from "@/lib/workspace-layout";
import type { Asset, AssetStatus, AssetType } from "@/types/domain";

type AssetMarkerProps = {
  asset: Asset;
  position: Point;
  status?: AssetStatus;
  type?: AssetType;
  selected: boolean;
  focused: boolean;
  highlighted: boolean;
  dimmed: boolean;
  onSelect: (assetId: string) => void;
  onHoverChange: (assetId: string | null) => void;
};

export function AssetMarker({
  asset,
  position,
  status,
  type,
  selected,
  focused,
  highlighted,
  dimmed,
  onSelect,
  onHoverChange,
}: AssetMarkerProps) {
  const color = statusColor(status?.slug ?? "offline", status?.color);
  const label = asset.code?.slice(0, 4) ?? asset.name.slice(0, 3).toUpperCase();

  return (
    <button
      type="button"
      data-workspace-marker
      data-asset-id={asset.id}
      title={`${asset.name}${status ? ` · ${status.name}` : ""}`}
      aria-label={`${asset.name}${status ? `, ${status.name}` : ""}`}
      aria-pressed={selected}
      className={cn(
        "absolute z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-[var(--ops-radius)] border-2 text-[10px] font-bold shadow-[var(--ops-shadow-sm)] transition-[transform,box-shadow,opacity,filter] duration-150",
        "focus-visible:outline-none",
        selected && "z-30 scale-110",
        focused && "z-30",
        highlighted && !selected && "z-20",
        dimmed && "opacity-35",
        !dimmed && "hover:z-20 hover:scale-110",
      )}
      style={{
        left: position.x,
        top: position.y,
        backgroundColor: `${color}28`,
        borderColor: color,
        color: "var(--ops-text)",
        boxShadow: selected
          ? `0 0 0 3px var(--ops-accent), 0 0 0 6px color-mix(in srgb, var(--ops-accent) 35%, transparent)`
          : focused
            ? `0 0 0 3px ${color}, 0 0 16px color-mix(in srgb, ${color} 45%, transparent)`
            : highlighted
              ? `0 0 0 2px ${color}, 0 0 12px color-mix(in srgb, ${color} 40%, transparent)`
              : undefined,
        filter: highlighted && !selected ? "brightness(1.15)" : undefined,
      }}
      onPointerEnter={() => onHoverChange(asset.id)}
      onPointerLeave={() => onHoverChange(null)}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(asset.id);
      }}
    >
      <span className="leading-none tracking-tight">{label}</span>
      {type ? (
        <span className="mt-0.5 max-w-[2.5rem] truncate text-[8px] font-medium text-[var(--ops-text-muted)]">
          {type.name}
        </span>
      ) : null}
    </button>
  );
}
