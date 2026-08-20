"use client";

/**
 * Shared loader for Supabase integration status (Phase 4).
 * Used by the Integrations index card and the full Supabase panel so the
 * read-only probes run at most once per mount.
 */

import { useCallback, useEffect, useState } from "react";

import { getSupabaseIntegrationStatus } from "@/services/settings";
import type { SupabaseIntegrationStatus } from "@/actions/settings";

export function useSupabaseStatus() {
  const [status, setStatus] = useState<SupabaseIntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getSupabaseIntegrationStatus()
      .then((data) => {
        if (cancelled) return;
        setStatus(data);
        setError(null);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || "Failed to read Supabase status.");
        setStatus(null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const retry = useCallback(() => setToken((n) => n + 1), []);

  return { status, loading, error, retry };
}