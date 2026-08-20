"use client";

/**
 * Property Types configuration UI.
 * Asset types drive the property/villa type dropdown (AssetForm, filters).
 * The default set is seeded idempotently from DEFAULT_ASSET_TYPES via the
 * /api/asset-types/seed-defaults route — the same mechanism as the Status
 * Engine. Type management (create/rename/delete) stays server-side only.
 */

import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { listAssetTypes, seedDefaultAssetTypes } from "@/services/asset-types";
import { useShell } from "@/stores/shell-context";
import { usePermissions } from "@/stores/user-context";
import { useToast } from "@/stores/toast-context";
import type { AssetType } from "@/types/domain";

export function AssetTypesSection() {
  const toast = useToast();
  const { demoMode } = useShell();
  const { canManage } = usePermissions();
  const canMutate = canManage && !demoMode;

  const [types, setTypes] = useState<AssetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    listAssetTypes()
      .then((res) => {
        if (cancelled) return;
        setTypes(res.data);
        setError(null);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || "Failed to load property types.");
        setTypes([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  async function handleSeed() {
    setSeeding(true);
    try {
      const res = await seedDefaultAssetTypes();
      setTypes(res.data);
      setError(null);
      toast.success("Default property types seeded");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Seed failed.";
      setError(message);
      toast.error("Seed failed", message);
    } finally {
      setSeeding(false);
    }
  }

  return (
    <section className="rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] shadow-sm bg-[var(--ops-surface)]">
      <div className="flex flex-wrap items-start gap-3 border-b border-[var(--ops-border-subtle)] p-4">
        <div>
          <h2 className="text-[16px] font-bold text-[var(--ops-text)]">
            Property Types
          </h2>
          <p className="mt-0.5 max-w-xl text-[13px] text-[var(--ops-text-secondary)]">
            Property/villa types available when creating or filtering
            properties. Seed defaults to restore the standard set.
          </p>
        </div>
        {canMutate ? (
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void handleSeed()}
              disabled={seeding}
            >
              {seeding ? "Seeding…" : "Seed defaults"}
            </Button>
          </div>
        ) : (
          <p className="ml-auto text-xs text-[var(--ops-text-muted)]">
            {demoMode
              ? "Demo Mode is read-only"
              : "Manager access required"}
          </p>
        )}
      </div>

      <div className="p-4">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : null}

        {!loading && error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : null}

        {!loading && !error && types.length === 0 ? (
          <EmptyState
            title="NO PROPERTY TYPES"
            description="Seed defaults or ask a manager to add the standard property/villa type."
            action={
              canMutate ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => void handleSeed()}
                  disabled={seeding}
                >
                  Seed defaults
                </Button>
              ) : undefined
            }
          />
        ) : null}

        {!loading && !error && types.length > 0 ? (
          <table className="w-full min-w-[480px] border-collapse text-left text-sm">
            <thead className="text-[11px] tracking-wide text-[var(--ops-text-muted)] uppercase">
              <tr className="border-b border-[var(--ops-border)]">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Slug</th>
                <th className="px-3 py-2 font-medium">Order</th>
                <th className="px-3 py-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {types.map((type) => (
                <tr
                  key={type.id}
                  className="border-b border-[var(--ops-border-subtle)] hover:bg-[var(--ops-surface-hover)]"
                >
                  <td className="px-3 py-2.5 font-medium text-[var(--ops-text)]">
                    {type.name}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-[var(--ops-text-secondary)]">
                    {type.slug}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[var(--ops-text-secondary)]">
                    {type.sort_order}
                  </td>
                  <td className="max-w-[260px] truncate px-3 py-2.5 text-[var(--ops-text-secondary)]">
                    {type.description ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </section>
  );
}