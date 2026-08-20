"use client";

/**
 * Integrations index (Phase 4) — lists configured integration slots with
 * their live status and deep-links into the per-integration panels.
 */

import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSupabaseStatus } from "@/features/settings/useSupabaseStatus";
import { cn } from "@/lib/cn";

type IntegrationId = "supabase" | "whatsapp";

function IntegrationCard({
  id,
  icon,
  name,
  description,
  statusLabel,
  statusOk,
  loading,
  onOpen,
}: {
  id: IntegrationId;
  icon: "database" | "info";
  name: string;
  description: string;
  statusLabel: string;
  statusOk?: boolean;
  loading?: boolean;
  onOpen: (id: IntegrationId) => void;
}) {
  return (
    <div className="rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] shadow-sm bg-[var(--ops-surface)] p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--ops-radius-lg)] bg-[var(--ops-accent-muted)] text-[var(--ops-accent)]">
          <Icon name={icon} size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--ops-text)]">
              {name}
            </h3>
            {loading ? (
              <Skeleton className="h-4 w-16 rounded-full" />
            ) : (
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wide uppercase",
                  statusOk
                    ? "border-[var(--ops-border)] text-[var(--ops-text-secondary)]"
                    : "border-[var(--ops-border)] text-[var(--ops-text-muted)]",
                )}
              >
                {statusLabel}
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] text-[var(--ops-text-secondary)]">
            {description}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onOpen(id)}
          className="shrink-0"
        >
          Configure
        </Button>
      </div>
    </div>
  );
}

export function IntegrationsSection({
  onOpen,
}: {
  onOpen: (id: IntegrationId) => void;
}) {
  const { status, loading, error, retry } = useSupabaseStatus();

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-2xl text-sm text-[var(--ops-text-secondary)]">
        Connect and verify the external infrastructure the application uses.
        Integration credentials are never displayed or stored by the
        application.
      </p>

      {error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : null}

      <IntegrationCard
        id="supabase"
        icon="database"
        name="Supabase"
        description="Database, storage, and authentication. Configured at deployment via environment variables."
        statusLabel={
          loading
            ? "Checking"
            : status?.configured
              ? "Configured"
              : "Not configured"
        }
        statusOk={loading ? undefined : status?.configured}
        loading={loading}
        onOpen={onOpen}
      />

      <IntegrationCard
        id="whatsapp"
        icon="info"
        name="WhatsApp"
        description="Messaging and lead capture. Foundation slot — functional integration is deferred."
        statusLabel="Not connected"
        statusOk={false}
        onOpen={onOpen}
      />
    </div>
  );
}