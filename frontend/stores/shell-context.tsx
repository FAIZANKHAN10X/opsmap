"use client";

/**
 * Shell UI state only — no server/business data.
 * Selected project id is UI/session preference for the workspace.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { AssetFilterState, NavItemId } from "@/types/ui";

type ShellContextValue = {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (value: boolean) => void;
  infoPanelOpen: boolean;
  setInfoPanelOpen: (value: boolean) => void;
  toggleInfoPanel: () => void;
  activeNav: NavItemId;
  setActiveNav: (id: NavItemId) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  selectedAssetId: string | null;
  setSelectedAssetId: (id: string | null) => void;
  /**
   * List → map focus signal (P0 real map). The workspace bumps this when a
   * property is selected outside the map (e.g. list row) so the map can fly
   * to its marker. `nonce` re-triggers focus for the same asset.
   */
  mapFocusRequest: { assetId: string; nonce: number } | null;
  requestMapFocus: (assetId: string) => void;
  filters: AssetFilterState;
  setSearch: (search: string) => void;
  toggleStatusFilter: (slug: string) => void;
  toggleTypeFilter: (slug: string) => void;
  /** Placement filter for the real map (null = all). */
  setPlacementFilter: (value: "placed" | "unplaced" | null) => void;
  clearFilters: () => void;
  /** Replace the whole filter state at once (URL hydration / restores). */
  applyFilters: (filters: AssetFilterState) => void;
  setPriceFilter: (min: number | null, max: number | null, currency?: string | null) => void;
  setBedsBathsFilter: (bedroomsMin: number | null, bathroomsMin: number | null) => void;
  setAreaFilter: (min: number | null, max: number | null) => void;
  setFurnishingFilter: (value: string | null) => void;
  toggleFeatureFilter: (feature: string) => void;
  removeFilter: (key: string, value?: string) => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (value: boolean) => void;
  /** Demo/Mock Data mode (Phase 13). Session-local, in-memory, not persisted. */
  demoMode: boolean;
  setDemoMode: (value: boolean) => void;
  /**
   * Monotonic counter bumped after any data mutation. Mounted data surfaces
   * refetch when it changes (Phase 15 change propagation) so mutations
   * propagate without a manual browser refresh.
   */
  refreshKey: number;
  bumpRefresh: () => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);

const defaultFilters: AssetFilterState = {
  search: "",
  statusSlugs: [],
  typeSlugs: [],
  priceMin: null,
  priceMax: null,
  currency: null,
  bedroomsMin: null,
  bathroomsMin: null,
  areaMin: null,
  areaMax: null,
  furnishing: null,
  features: [],
};

export function ShellProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);
  const [activeNav, setActiveNav] = useState<NavItemId>("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [mapFocusRequest, setMapFocusRequest] = useState<{
    assetId: string;
    nonce: number;
  } | null>(null);
  const [filters, setFilters] = useState<AssetFilterState>(defaultFilters);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const requestMapFocus = useCallback((assetId: string) => {
    setSelectedAssetId(assetId);
    setInfoPanelOpen(true);
    setMapFocusRequest((prev) => ({
      assetId,
      nonce: (prev?.nonce ?? 0) + 1,
    }));
  }, []);

  const bumpRefresh = useCallback(() => {
    setRefreshKey((n) => n + 1);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((v) => !v);
  }, []);

  const toggleInfoPanel = useCallback(() => {
    setInfoPanelOpen((v) => !v);
  }, []);

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  }, []);

  const toggleStatusFilter = useCallback((slug: string) => {
    setFilters((prev) => {
      const exists = prev.statusSlugs.includes(slug);
      return {
        ...prev,
        statusSlugs: exists
          ? prev.statusSlugs.filter((s) => s !== slug)
          : [...prev.statusSlugs, slug],
      };
    });
  }, []);

  const toggleTypeFilter = useCallback((slug: string) => {
    setFilters((prev) => {
      const exists = prev.typeSlugs.includes(slug);
      return {
        ...prev,
        typeSlugs: exists
          ? prev.typeSlugs.filter((s) => s !== slug)
          : [...prev.typeSlugs, slug],
      };
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const setPlacementFilter = useCallback(
    (value: "placed" | "unplaced" | null) => {
      setFilters((prev) => ({ ...prev, placement: value }));
    },
    [],
  );

  const setPriceFilter = useCallback(
    (min: number | null, max: number | null, currency?: string | null) => {
      setFilters((prev) => ({
        ...prev,
        priceMin: min,
        priceMax: max,
        currency: currency !== undefined ? currency : prev.currency,
      }));
    },
    [],
  );

  const setBedsBathsFilter = useCallback(
    (bedroomsMin: number | null, bathroomsMin: number | null) => {
      setFilters((prev) => ({ ...prev, bedroomsMin, bathroomsMin }));
    },
    [],
  );

  const setAreaFilter = useCallback(
    (min: number | null, max: number | null) => {
      setFilters((prev) => ({ ...prev, areaMin: min, areaMax: max }));
    },
    [],
  );

  const setFurnishingFilter = useCallback(
    (value: string | null) => {
      setFilters((prev) => ({ ...prev, furnishing: value }));
    },
    [],
  );

  const toggleFeatureFilter = useCallback((feature: string) => {
    setFilters((prev) => {
      const cur = prev.features ?? [];
      const exists = cur.includes(feature);
      return {
        ...prev,
        features: exists ? cur.filter((f) => f !== feature) : [...cur, feature],
      };
    });
  }, []);

  const removeFilter = useCallback((key: string, value?: string) => {
    setFilters((prev) => {
      switch (key) {
        case "search":
          return { ...prev, search: "" };
        case "status":
          return { ...prev, statusSlugs: value ? prev.statusSlugs.filter((s) => s !== value) : [] };
        case "type":
          return { ...prev, typeSlugs: value ? prev.typeSlugs.filter((s) => s !== value) : [] };
        case "placement":
          return { ...prev, placement: null };
        case "price":
          return { ...prev, priceMin: null, priceMax: null, currency: null };
        case "bedrooms":
          return { ...prev, bedroomsMin: null };
        case "bathrooms":
          return { ...prev, bathroomsMin: null };
        case "area":
          return { ...prev, areaMin: null, areaMax: null };
        case "furnishing":
          return { ...prev, furnishing: null };
        case "features":
          return {
            ...prev,
            features: value ? (prev.features ?? []).filter((f) => f !== value) : [],
          };
        default:
          return prev;
      }
    });
  }, []);

  const applyFilters = useCallback((next: AssetFilterState) => {
    setFilters({
      search: next.search ?? "",
      statusSlugs: next.statusSlugs ?? [],
      typeSlugs: next.typeSlugs ?? [],
      placement: next.placement ?? null,
      priceMin: next.priceMin ?? null,
      priceMax: next.priceMax ?? null,
      currency: next.currency ?? null,
      bedroomsMin: next.bedroomsMin ?? null,
      bathroomsMin: next.bathroomsMin ?? null,
      areaMin: next.areaMin ?? null,
      areaMax: next.areaMax ?? null,
      furnishing: next.furnishing ?? null,
      features: next.features ?? [],
    });
  }, []);

  const value = useMemo<ShellContextValue>(
    () => ({
      sidebarCollapsed,
      toggleSidebar,
      setSidebarCollapsed,
      infoPanelOpen,
      setInfoPanelOpen,
      toggleInfoPanel,
      activeNav,
      setActiveNav,
      selectedProjectId,
      setSelectedProjectId,
      selectedAssetId,
      setSelectedAssetId,
      mapFocusRequest,
      requestMapFocus,
      filters,
      setSearch,
      toggleStatusFilter,
      toggleTypeFilter,
      setPlacementFilter,
      clearFilters,
      applyFilters,
      setPriceFilter,
      setBedsBathsFilter,
      setAreaFilter,
      setFurnishingFilter,
      toggleFeatureFilter,
      removeFilter,
      mobileNavOpen,
      setMobileNavOpen,
      demoMode,
      setDemoMode,
      refreshKey,
      bumpRefresh,
    }),
    [
      sidebarCollapsed,
      toggleSidebar,
      infoPanelOpen,
      toggleInfoPanel,
      activeNav,
      selectedProjectId,
      selectedAssetId,
      mapFocusRequest,
      requestMapFocus,
      filters,
      setSearch,
      toggleStatusFilter,
      toggleTypeFilter,
      setPlacementFilter,
      clearFilters,
      applyFilters,
      setPriceFilter,
      setBedsBathsFilter,
      setAreaFilter,
      setFurnishingFilter,
      toggleFeatureFilter,
      removeFilter,
      mobileNavOpen,
      demoMode,
      refreshKey,
      bumpRefresh,
    ],
  );

  return (
    <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
  );
}

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) {
    throw new Error("useShell must be used within ShellProvider");
  }
  return ctx;
}
