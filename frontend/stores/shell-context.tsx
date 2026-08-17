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
  filters: AssetFilterState;
  setSearch: (search: string) => void;
  toggleStatusFilter: (slug: string) => void;
  toggleTypeFilter: (slug: string) => void;
  clearFilters: () => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (value: boolean) => void;
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
  const [filters, setFilters] = useState<AssetFilterState>(defaultFilters);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
      filters,
      setSearch,
      toggleStatusFilter,
      toggleTypeFilter,
      clearFilters,
      mobileNavOpen,
      setMobileNavOpen,
    }),
    [
      sidebarCollapsed,
      toggleSidebar,
      infoPanelOpen,
      toggleInfoPanel,
      activeNav,
      selectedProjectId,
      selectedAssetId,
      filters,
      setSearch,
      toggleStatusFilter,
      toggleTypeFilter,
      clearFilters,
      mobileNavOpen,
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
