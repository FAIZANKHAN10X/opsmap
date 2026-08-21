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

  const applyFilters = useCallback((next: AssetFilterState) => {
    setFilters({
      search: next.search ?? "",
      statusSlugs: next.statusSlugs ?? [],
      typeSlugs: next.typeSlugs ?? [],
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
