"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useShell } from "@/stores/shell-context";
import type { AttentionData } from "@/types/domain";

type Props = {
  attention: AttentionData | null;
  loading?: boolean;
};

export function NeedsAttention({ attention, loading }: Props) {
  const router = useRouter();
  const shell = useShell();

  if (loading) {
    return (
      <section className="rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] bg-white p-6 shadow-sm">
        <div className="h-5 w-40 rounded bg-[var(--ops-surface-hover)] animate-pulse" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="h-24 rounded-xl bg-[var(--ops-surface-hover)] animate-pulse" />
          <div className="h-24 rounded-xl bg-[var(--ops-surface-hover)] animate-pulse" />
        </div>
      </section>
    );
  }

  if (!attention || attention.issues.length === 0) {
    return (
      <section className="rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Icon name="check" size={16} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--ops-text)]">All clear</h3>
            <p className="text-xs text-[var(--ops-text-muted)]">No active properties need attention right now.</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-[var(--ops-text-muted)]">Derived from current record state, not audited history.</p>
      </section>
    );
  }

  function handleAction(issue: AttentionData["issues"][number]) {
    if (issue.key === "unplaced") {
      shell.setPlacementFilter("unplaced");
      router.push("/dashboard/development");
      return;
    }
    if (issue.key === "maintenance") {
      router.push("/dashboard/development?status=maintenance");
      return;
    }
    router.push(issue.href);
  }

  return (
    <section className="rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[16px] font-bold text-[var(--ops-text)]">Needs Attention</h2>
          <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
            {attention.totalActive} active {attention.totalActive === 1 ? "property" : "properties"} · derived from current records
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
          {attention.issues.length} {attention.issues.length === 1 ? "issue" : "issues"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {attention.issues.map((issue) => (
          <div
            key={issue.key}
            className={`flex flex-col rounded-xl border p-4 ${
              issue.severity === "warning"
                ? "border-amber-200 bg-amber-50/40"
                : "border-[var(--ops-border-subtle)] bg-[var(--ops-surface-hover)]"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  issue.severity === "warning" ? "bg-amber-100 text-amber-700" : "bg-white text-[var(--ops-text-muted)] border border-[var(--ops-border-subtle)]"
                }`}
              >
                <Icon name={issue.key === "unplaced" ? "pin" : issue.key === "withoutPhotos" ? "image" : issue.key === "maintenance" ? "alert" : "info"} size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--ops-text)]">{issue.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--ops-text-secondary)]">{issue.description}</p>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                variant={issue.severity === "warning" ? "primary" : "secondary"}
                size="sm"
                className="rounded-full"
                onClick={() => handleAction(issue)}
              >
                {issue.actionLabel}
                <Icon name="chevron-right" size={14} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
