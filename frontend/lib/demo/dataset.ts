/**
 * 8AM HUB demo dataset (Phase 13).
 *
 * A deterministic, self-contained fixture for Demo/Mock Data mode. It lives
 * outside the database on purpose: switching Demo ON never writes, seeds, or
 * mutates production tables, so real data can never be contaminated,
 * duplicated, or overwritten. Demo assets reference status/type by slug and
 * are resolved against the real status engine at request time (see
 * `lib/demo/provider.ts`), so the existing legend/status/filter machinery
 * drives them.
 *
 * This module is intentionally pure and dependency-free so it can be imported
 * from both client components (displaying the demo project name/state) and
 * server code (the demo data provider).
 */

export const DEMO_PROJECT_ID = "d0a00000-0000-4000-8000-000000000000";

export type DemoAssetSeed = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  /** Slug of a real AssetStatus (resolved at request time). */
  statusSlug: string;
  /** Slug of a real AssetType (resolved at request time; null = untyped). */
  typeSlug: string | null;
  owner: string | null;
  notes: string | null;
  assignees: string[];
  metadata: Record<string, unknown>;
};

export const DEMO_PROJECT = {
  id: DEMO_PROJECT_ID,
  name: 'ULLUWATU "26',
  slug: "ulluwatu-26-demo",
  description:
    "Demo development — 16-villa property spread used by Demo/Mock Data mode. Switched on and off from the topbar; never written to the database.",
  status: "active",
} as const;

/**
 * Deterministic UUID for a demo asset. Distinct from the demo project id and
 * stable across OFF → ON → OFF → ON cycles (same ids, no duplicates).
 */
function demoAssetId(n: number): string {
  return `d0${String(n).padStart(2, "0")}0000-0000-4000-8000-000000000000`;
}

/** Staggered creation dates so created_at sorting is deterministic. */
export function demoCreatedAt(n: number): string {
  return new Date(Date.UTC(2026, 6, 1 + n)).toISOString();
}

/**
 * Sixteen villas across all four legend concepts (OPEN / FILLING /
 * SOLD OUT / NO OPS DATA). Capacity + placed drive the four dashboard KPI
 * blocks through the exact same aggregation used for real data
 * (`summarizeProject`): they are NOT hardcoded dashboard numbers.
 */
export const DEMO_ASSETS: DemoAssetSeed[] = [
  // OPEN — available
  { id: demoAssetId(1), name: "Villa Melasti", code: "V-101", description: "Beach-facing villa with private plunge pool.", statusSlug: "available", typeSlug: "villa", owner: "Made Wijaya", notes: "Ready for handover.", assignees: ["Ayu", "Budi"], metadata: { capacity: 4, placed: 0, map_x: 180, map_y: 160, bedrooms: 2, bathrooms: 2, area_sqm: 96, view: "Ocean", floor: "Ground" } },
  { id: demoAssetId(2), name: "Villa Nyang Nyang", code: "V-102", description: "Two-storey villa over the southern cliffs.", statusSlug: "available", typeSlug: "villa", owner: "Ketut Sudiarta", notes: null, assignees: ["Citra", "Dewa"], metadata: { capacity: 6, placed: 2, map_x: 600, map_y: 150, bedrooms: 3, bathrooms: 3, area_sqm: 148, view: "Cliff", floor: "2-Story" } },
  { id: demoAssetId(3), name: "Villa Suluban", code: "V-103", description: "Garden villa near the surf break.", statusSlug: "available", typeSlug: "villa", owner: "Komang Astawa", notes: "Pool maintenance completed.", assignees: ["Ayu", "Eka"], metadata: { capacity: 6, placed: 0, map_x: 1020, map_y: 170, bedrooms: 3, bathrooms: 3, area_sqm: 132, view: "Garden", floor: "Ground" } },
  { id: demoAssetId(4), name: "Villa Padang Padang", code: "V-104", description: "Cliff-top villa with ocean horizon views.", statusSlug: "available", typeSlug: "villa", owner: "Putu Arini", notes: null, assignees: ["Budi", "Gede"], metadata: { capacity: 8, placed: 3, map_x: 1390, map_y: 150, bedrooms: 4, bathrooms: 4, area_sqm: 204, view: "Ocean", floor: "2-Story" } },
  // FILLING — reserved / occupied / pending
  { id: demoAssetId(5), name: "Villa Dreamland", code: "V-105", description: "Reserved for an incoming group booking.", statusSlug: "reserved", typeSlug: "villa", owner: "Gede Rai", notes: "Guest arrival expected Saturday.", assignees: ["Citra", "Dewa"], metadata: { capacity: 4, placed: 2, map_x: 220, map_y: 400, bedrooms: 2, bathrooms: 2, area_sqm: 92, view: "Garden", floor: "Ground" } },
  { id: demoAssetId(6), name: "Villa Uluwatu", code: "V-106", description: "Occupied villa, fully serviced.", statusSlug: "occupied", typeSlug: "villa", owner: "Wayan Suardana", notes: null, assignees: ["Eka", "Ayu"], metadata: { capacity: 6, placed: 4, map_x: 560, map_y: 420, bedrooms: 3, bathrooms: 3, area_sqm: 140, view: "Ocean", floor: "2-Story" } },
  { id: demoAssetId(7), name: "Villa Blue Point", code: "V-107", description: "Peak-season occupancy, high placement.", statusSlug: "occupied", typeSlug: "villa", owner: "Nyoman Kari", notes: "Requested late checkout.", assignees: ["Budi", "Citra"], metadata: { capacity: 8, placed: 6, map_x: 940, map_y: 390, bedrooms: 4, bathrooms: 4, area_sqm: 218, view: "Cliff", floor: "2-Story" } },
  { id: demoAssetId(8), name: "Villa Pecatu", code: "V-108", description: "Occupied garden villa.", statusSlug: "occupied", typeSlug: "villa", owner: "I Gusti Agung Pande", notes: null, assignees: ["Gede", "Dewa"], metadata: { capacity: 6, placed: 5, map_x: 1310, map_y: 410, bedrooms: 3, bathrooms: 3, area_sqm: 136, view: "Garden", floor: "Ground" } },
  { id: demoAssetId(9), name: "Villa Garuda", code: "V-109", description: "Pending handover from finishing works.", statusSlug: "pending", typeSlug: "villa", owner: "Luh Gede Ayu", notes: "Final inspection Friday.", assignees: ["Ayu", "Eka"], metadata: { capacity: 4, placed: 1, map_x: 260, map_y: 640, bedrooms: 2, bathrooms: 2, area_sqm: 88, view: "Garden", floor: "Ground" } },
  { id: demoAssetId(10), name: "Villa Kecapi", code: "V-110", description: "Pending booking confirmation.", statusSlug: "pending", typeSlug: "villa", owner: "Anak Agung Mas", notes: null, assignees: ["Citra", "Budi"], metadata: { capacity: 6, placed: 2, map_x: 600, map_y: 660, bedrooms: 3, bathrooms: 3, area_sqm: 144, view: "Ocean", floor: "2-Story" } },
  // SOLD OUT — sold
  { id: demoAssetId(11), name: "Villa Angklung", code: "V-111", description: "Sold out — transaction completed.", statusSlug: "sold", typeSlug: "villa", owner: "Komang Ayu", notes: null, assignees: ["Gede", "Ayu"], metadata: { capacity: 8, placed: 0, map_x: 980, map_y: 630, bedrooms: 4, bathrooms: 4, area_sqm: 226, view: "Ocean", floor: "2-Story" } },
  { id: demoAssetId(12), name: "Villa Bajra", code: "V-112", description: "Sold out.", statusSlug: "sold", typeSlug: "villa", owner: "Made Darmawan", notes: null, assignees: ["Dewa", "Citra"], metadata: { capacity: 6, placed: 0, map_x: 1330, map_y: 650, bedrooms: 3, bathrooms: 3, area_sqm: 150, view: "Garden", floor: "Ground" } },
  { id: demoAssetId(13), name: "Villa Semilat", code: "V-113", description: "Sold out — completed sale.", statusSlug: "sold", typeSlug: "villa", owner: "Ketut Landra", notes: "Handover docs archived.", assignees: ["Budi", "Eka"], metadata: { capacity: 4, placed: 0, map_x: 180, map_y: 850, bedrooms: 2, bathrooms: 2, area_sqm: 90, view: "Garden", floor: "Ground" } },
  // NO OPS DATA — maintenance / offline
  { id: demoAssetId(14), name: "Villa Tegal", code: "V-114", description: "Closed for maintenance.", statusSlug: "maintenance", typeSlug: "villa", owner: "Putu Setiawan", notes: "Structural inspection in progress.", assignees: ["Ayu", "Gede"], metadata: { capacity: 6, placed: 0, map_x: 640, map_y: 870, bedrooms: 3, bathrooms: 3, area_sqm: 138, view: "Garden", floor: "Ground" } },
  { id: demoAssetId(15), name: "Villa Karang", code: "V-115", description: "Offline pending utilities reconnection.", statusSlug: "offline", typeSlug: "villa", owner: "Wayan Raka", notes: null, assignees: ["Dewa", "Citra"], metadata: { capacity: 4, placed: 0, map_x: 1080, map_y: 840, bedrooms: 2, bathrooms: 2, area_sqm: 94, view: "Cliff", floor: "Ground" } },
  { id: demoAssetId(16), name: "Villa Karang View", code: "V-116", description: "Offline for seasonal closure.", statusSlug: "offline", typeSlug: "villa", owner: "Putu Setiawan", notes: null, assignees: ["Eka", "Budi"], metadata: { capacity: 6, placed: 0, map_x: 1410, map_y: 880, bedrooms: 3, bathrooms: 3, area_sqm: 142, view: "Cliff", floor: "2-Story" } },
];

/** Display label used across the chrome while demo mode is active. */
export const DEMO_MODE_LABEL = "Demo";
