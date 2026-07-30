/**
 * Status appearance resolution.
 *
 * Phase 6 rule: UI appearance is computed from backend status data.
 * Prefer AssetStatus.color from the service always.
 * FALLBACK is only for legacy rows with a missing color — never invent
 * alternate colors when the API/mock already provides one.
 */

const FALLBACK: Record<string, string> = {
  available: "#22c55e",
  reserved: "#38bdf8",
  occupied: "#f59e0b",
  sold: "#c026d3",
  maintenance: "#ef4444",
  pending: "#a78bfa",
  offline: "#64748b",
  completed: "#14b8a6",
  inactive: "#64748b",
};

/**
 * Resolve display color for a status.
 * @param slug Status slug (for fallback only)
 * @param explicit Color from AssetStatus.color (preferred)
 */
export function statusColor(slug: string, explicit?: string | null): string {
  if (explicit && explicit.trim()) {
    return explicit.trim();
  }
  return FALLBACK[slug.toLowerCase()] ?? "#6b7380";
}

/** Known palette for the status color picker in Settings. */
export const STATUS_COLOR_PRESETS: string[] = [
  "#22c55e",
  "#38bdf8",
  "#f59e0b",
  "#c026d3",
  "#ef4444",
  "#a78bfa",
  "#64748b",
  "#14b8a6",
  "#f97316",
  "#eab308",
  "#06b6d4",
  "#ec4899",
];
