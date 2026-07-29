/**
 * Canonical status color map for the platform.
 * Prefer AssetStatus.color from the API when present.
 */

const FALLBACK: Record<string, string> = {
  available: "var(--ops-status-available)",
  occupied: "var(--ops-status-occupied)",
  reserved: "var(--ops-status-reserved)",
  maintenance: "var(--ops-status-maintenance)",
  offline: "var(--ops-status-offline)",
  pending: "var(--ops-status-pending)",
  completed: "var(--ops-status-completed)",
};

export function statusColor(slug: string, explicit?: string | null): string {
  if (explicit) return explicit;
  return FALLBACK[slug.toLowerCase()] ?? "var(--ops-text-muted)";
}
