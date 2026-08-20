"use client";

/**
 * Supabase integration panel (Phase 4).
 *
 * Supabase is deployment/bootstrap configuration: the project URL, anon key,
 * and service-role key are read from environment variables at build/request
 * time. Runtime switching of the foundational database is NOT supported and
 * is not pretended here. This panel reports the configured state safely —
 * public URL only, no anon key, no service-role key, no secrets.
 */

import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSupabaseStatus } from "@/features/settings/useSupabaseStatus";
import { cn } from "@/lib/cn";

function Row({
  label,
  value,
  ok,
  muted,
  mono,
}: {
  label: string;
  value: string;
  ok?: boolean;
  muted?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--ops-border-subtle)] px-4 py-3 text-sm last:border-0">
      <span className="text-[var(--ops-text-secondary)]">{label}</span>
      <span
        className={cn(
          "flex items-center gap-2 text-right",
          mono && "font-mono text-xs",
          muted && "text-[var(--ops-text-muted)]",
        )}
      >
        {ok !== undefined ? (
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              ok ? "bg-[var(--ops-success)]" : "bg-[var(--ops-danger)]",
            )}
          />
        ) : null}
        {value}
      </span>
    </div>
  );
}

export function SupabaseIntegrationSection() {
  const { status, loading, error, retry } = useSupabaseStatus();

  return (
    <div className="rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] shadow-sm bg-[var(--ops-surface)]">
      <header className="flex flex-wrap items-start gap-3 border-b border-[var(--ops-border-subtle)] p-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-[var(--ops-text)]">
            Supabase
          </h2>
          {!loading && status ? (
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wide uppercase",
                status.configured
                  ? "border-[var(--ops-border)] text-[var(--ops-text-secondary)]"
                  : "border-[var(--ops-border)] text-[var(--ops-text-muted)]",
              )}
            >
              {status.configured ? "Configured" : "Not configured"}
            </span>
          ) : null}
        </div>
        <p className="mt-1 w-full max-w-xl text-[13px] text-[var(--ops-text-secondary)]">
          The application&apos;s database, storage, and authentication.
          Configured at deployment via environment variables — it cannot be
          changed from this screen.
        </p>
        {!loading && !error ? (
          <Button variant="ghost" size="sm" onClick={retry} className="ml-auto">
            Re-check
          </Button>
        ) : null}
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
          <ErrorState message={error} onRetry={retry} />
        </div>
      ) : null}

      {!loading && !error && status && !status.configured ? (
        <div className="space-y-3 p-4">
          <p className="text-sm text-[var(--ops-text-secondary)]">
            Supabase is not configured for this deployment. The application
            will not authenticate users or store data until the following
            environment variables are set on the server at deploy time:
          </p>
          <ul className="space-y-1.5">
            {[
              "NEXT_PUBLIC_SUPABASE_URL",
              "NEXT_PUBLIC_SUPABASE_ANON_KEY",
            ].map((name) => (
              <li
                key={name}
                className="flex items-center gap-2 rounded-[var(--ops-radius)] border border-[var(--ops-border-subtle)] bg-[var(--ops-bg)] px-3 py-2 font-mono text-xs text-[var(--ops-text-secondary)]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--ops-text-muted)]" />
                {name}
              </li>
            ))}
          </ul>
          <p className="text-xs text-[var(--ops-text-muted)]">
            Additional server-only secret credentials are configured by the
            operator in the deployment environment and are never displayed or
            stored by the application.
          </p>
        </div>
      ) : null}

      {!loading && !error && status && status.configured ? (
        <div>
          <Row label="Project URL" value={status.url ?? "—"} mono muted={false} />
          <Row
            label="Configuration source"
            value="Environment (deployment)"
            muted
          />
          <Row
            label="Environment"
            value={status.environment}
            mono
            muted
          />
          <Row
            label="Database"
            value={status.database ? "Connected" : "Unreachable"}
            ok={status.database}
          />
          <Row
            label="Storage"
            value={status.storage ? "Connected" : "Unreachable"}
            ok={status.storage}
          />
          <Row
            label="Documents bucket"
            value={
              status.documentsBucket
                ? "Present"
                : status.storage
                  ? "Missing"
                  : "Unknown"
            }
            ok={status.storage ? status.documentsBucket : undefined}
          />
          <Row
            label="Authentication"
            value={status.auth ? "Verified" : "Not verified"}
            ok={status.auth}
          />
          <div className="p-4 pt-3">
            <p className="text-xs text-[var(--ops-text-muted)]">
              Connection checks run read-only against the configured project.
              Changing the Supabase project requires updating the deployment
              environment and rebuilding — the application does not support
              hot-swapping its database at runtime.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}