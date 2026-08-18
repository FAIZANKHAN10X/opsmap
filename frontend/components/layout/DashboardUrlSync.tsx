"use client";

/**
 * Two-way URL <-> shell state sync (Phase 14). Selected project, selected
 * asset, and the workspace filters live in the search params (project, asset,
 * search, status, type) so a refresh preserves the user's working context.
 *
 * Hydrates the shell store from the URL once on mount, then mirrors shell
 * changes back to the URL via replace() (no history spam). The comparison
 * guard prevents replace/re-render loops.
 */

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useShell } from "@/stores/shell-context";

function splitList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function DashboardUrlSync() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    selectedProjectId,
    setSelectedProjectId,
    selectedAssetId,
    setSelectedAssetId,
    filters,
    applyFilters,
  } = useShell();

  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    applyFilters({
      search: searchParams.get("search") ?? "",
      statusSlugs: splitList(searchParams.get("status")),
      typeSlugs: splitList(searchParams.get("type")),
    });
    const project = searchParams.get("project");
    const asset = searchParams.get("asset");
    setSelectedProjectId(project && project !== "" ? project : null);
    setSelectedAssetId(asset && asset !== "" ? asset : null);
    // Intentionally run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const next = new URLSearchParams();
    if (selectedProjectId) next.set("project", selectedProjectId);
    if (selectedAssetId) next.set("asset", selectedAssetId);
    if (filters.search) next.set("search", filters.search);
    if (filters.statusSlugs.length) next.set("status", filters.statusSlugs.join(","));
    if (filters.typeSlugs.length) next.set("type", filters.typeSlugs.join(","));

    const nextQs = next.toString();
    const currentQs = searchParams.toString();
    if (nextQs === currentQs) return;

    const path = window.location.pathname;
    router.replace(nextQs ? `${path}?${nextQs}` : path, { scroll: false });
  }, [selectedProjectId, selectedAssetId, filters, router, searchParams]);

  return null;
}