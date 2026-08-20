"use client";

/**
 * System section (Phase 4) — read-only application/system information sourced
 * from the existing /api/health endpoint. No secrets are shown.
 */

import { useEffect, useState } from "react";

import { ErrorState } from "@/components/feedback/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { getHealth, type HealthResponse } from "@/services/health";
import { cn } from "@/lib/cn";

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--ops-border-subtle)] px-4 py-3 text-sm last:border-0">
      <span className="text-[var(--ops-text-secondary)]">{label}</span>
      <span
        className={cn(
          "text-right",
          mono && "font-mono text-xs",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function SystemSection() {
  const [health, setHealth] = useState<HealthResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getHealth()
      .then((res) => {
        if (cancelled) return;
        setHealth(res.data);
        setError(null);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || "Failed to read system information.");
        setHealth(null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return (
    <div className="rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] shadow-sm bg-[var(--ops-surface)]">
      <header className="border-b border-[var(--ops-border-subtle)] p-4">
        <h2 className="text-sm font-semibold text-[var(--ops-text)]">
          System
        </h2>
        <p className="mt-1 max-w-xl text-[13px] text-[var(--ops-text-secondary)]">
          Read-only application and deployment information.
        </p>
      </header>

      {loading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <div className="p-4">
          <ErrorState
            message={error}
            onRetry={() => setReloadToken((n) => n + 1)}
          />
        </div>
      ) : null}

      {!loading && !error && health ? (
        <div>
          <Row label="Service" value={health.service} />
          <Row
            label="Environment"
            value={health.environment}
            mono
          />
          <Row
            label="Supabase"
            value={health.supabase === "configured" ? "Configured" : "Unavailable"}
          />
          <Row
            label="Email transport"
            value={health.email === "smtp" ? "SMTP" : "Log only"}
          />
          <Row
            label="Configuration source"
            value="Environment (deployment)"
          />
        </div>
      ) : null}
    </div>
  );
}