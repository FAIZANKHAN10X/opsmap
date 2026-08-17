/**
 * 8AM HUB status terminology — user-facing presentation layer only.
 *
 * The internal status engine stays configurable (AssetStatus). This module
 * maps engine slugs onto the 8AM HUB map legend concepts (OPEN / FILLING /
 * SOLD OUT / NO OPS DATA) and is the single source of truth for that
 * terminology mapping. It is intentionally pure — importable from both client
 * components and server services.
 *
 * Any slug not explicitly mapped falls through to NO OPS DATA so unknown /
 * custom statuses never render as a "live" concept.
 */

export type HubLegendConcept = "OPEN" | "FILLING" | "SOLD OUT" | "NO OPS DATA";

export const HUB_LEGEND_ORDER: HubLegendConcept[] = [
  "OPEN",
  "FILLING",
  "SOLD OUT",
  "NO OPS DATA",
];

/**
 * Legend colors reuse the default status-engine colors (available = green,
 * reserved/occupied = blue, sold = magenta, offline/maintenance = slate).
 */
export const HUB_LEGEND_COLORS: Record<HubLegendConcept, string> = {
  OPEN: "#22c55e",
  FILLING: "#38bdf8",
  "SOLD OUT": "#c026d3",
  "NO OPS DATA": "#64748b",
};

/** Default status-slug → 8AM HUB legend concept mapping. */
const LEGEND_BY_SLUG: Record<string, HubLegendConcept> = {
  available: "OPEN",
  reserved: "FILLING",
  occupied: "FILLING",
  pending: "FILLING",
  sold: "SOLD OUT",
  maintenance: "NO OPS DATA",
  offline: "NO OPS DATA",
};

export function legendConceptForStatus(
  slug: string | null | undefined,
): HubLegendConcept {
  if (!slug) return "NO OPS DATA";
  return LEGEND_BY_SLUG[slug] ?? "NO OPS DATA";
}