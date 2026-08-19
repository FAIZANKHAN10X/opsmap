"use client";

import { useEffect, useState } from "react";

import { getAsset } from "@/services/assets";
import { useShell } from "@/stores/shell-context";
import type { Asset } from "@/types/domain";

/**
 * Loads a single property so chrome (sidebar address) can show the selected
 * villa's address. Swallows errors — callers render a fallback.
 */
export function useAsset(assetId: string | null): Asset | null {
  const { demoMode, refreshKey } = useShell();
  const [asset, setAsset] = useState<Asset | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!assetId) {
      void Promise.resolve().then(() => {
        if (!cancelled) setAsset(null);
      });
      return () => {
        cancelled = true;
      };
    }
    getAsset(assetId, demoMode)
      .then((res) => {
        if (!cancelled) setAsset(res.data);
      })
      .catch(() => {
        if (!cancelled) setAsset(null);
      });
    return () => {
      cancelled = true;
    };
  }, [assetId, demoMode, refreshKey]);

  return asset;
}
