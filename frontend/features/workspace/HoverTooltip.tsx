"use client";

import { statusColor } from "@/lib/status-colors";
import type { Point } from "@/lib/workspace-layout";
import type { Asset, AssetStatus, AssetType } from "@/types/domain";

type HoverTooltipProps = {
  asset: Asset;
  position: Point;
  status?: AssetStatus;
  type?: AssetType;
  zoom: number;
};

export function HoverTooltip({
  asset,
  position,
  status,
  type,
  zoom,
}: HoverTooltipProps) {
  const color = statusColor(status?.slug ?? "offline", status?.color);

  return (
    <div
      className="pointer-events-none absolute z-40 -translate-x-1/2 rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-bg)]/95 px-2.5 py-1.5 shadow-[var(--ops-shadow)] backdrop-blur-sm"
      style={{
        left: position.x,
        top: position.y - 36 / zoom,
        transform: `translate(-50%, -100%) scale(${1 / zoom})`,
        transformOrigin: "bottom center",
      }}
    >
      <p className="whitespace-nowrap text-xs font-semibold text-[var(--ops-text)]">
        {asset.name}
      </p>
      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[var(--ops-text-secondary)]">
        {asset.code ? <span className="font-mono">{asset.code}</span> : null}
        {type ? <span>· {type.name}</span> : null}
        {status ? (
          <span className="inline-flex items-center gap-1">
            ·
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            {status.name}
          </span>
        ) : null}
      </div>
    </div>
  );
}
