"use client";

import { useEffect, useState } from "react";

import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/ui/Button";
import { generateProjectSummaryReport } from "@/actions/reports";
import { listProjects } from "@/services/projects";
import { unwrapAction } from "@/services/helpers";
import { useShell } from "@/stores/shell-context";
import { useToast } from "@/stores/toast-context";
import type { ProjectSummary } from "@/types/domain";

/**
 * Phase 9 (adapted) — generate project summary reports synchronously.
 * Full analytics dashboards belong to later roadmap phases.
 */
export function ReportsPage() {
  const { selectedProjectId } = useShell();
  const toast = useToast();
  const [projectName, setProjectName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ProjectSummary | null>(null);

  useEffect(() => {
    if (!selectedProjectId) {
      const t = window.setTimeout(() => setProjectName(null), 0);
      return () => window.clearTimeout(t);
    }
    let cancelled = false;
    listProjects()
      .then((res) => {
        if (cancelled) return;
        const match = res.data.find((p) => p.id === selectedProjectId);
        setProjectName(match?.name ?? null);
      })
      .catch(() => {
        if (!cancelled) setProjectName(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId]);

  async function handleGenerate() {
    if (!selectedProjectId) return;
    setBusy(true);
    setError(null);
    try {
      const result = unwrapAction(
        await generateProjectSummaryReport({
          report_type: "project_summary",
          project_id: selectedProjectId,
        }),
      );
      setSummary(result.data);
      toast.success("Report ready", "Project summary generated.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate report.";
      setError(message);
      setSummary(null);
      toast.error("Report failed", message);
    } finally {
      setBusy(false);
    }
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Select a project"
        description="Choose a project to generate a summary report."
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--ops-text)]">
          Reports
        </h1>
        <p className="text-sm text-[var(--ops-text-secondary)]">
          Generate project summaries on demand. The JSON artifact is written to
          the reports storage bucket and the results shown inline.
        </p>
      </header>

      <section className="rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-surface)] p-5 shadow-[var(--ops-shadow-sm)]">
        <p className="text-xs font-semibold tracking-wider text-[var(--ops-text-muted)] uppercase">
          Project summary
        </p>
        <p className="mt-2 text-sm text-[var(--ops-text)]">
          {projectName ?? "Current project"}
        </p>
        <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
          Counts assets by status and type, plus attached documents.
        </p>
        <div className="mt-4">
          <Button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={busy}
          >
            {busy ? "Generating…" : "Generate report"}
          </Button>
        </div>
      </section>

      {error ? (
        <p className="text-sm text-[var(--ops-danger)]" role="alert">
          {error}
        </p>
      ) : null}

      {summary ? (
        <section className="rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-surface)] p-5">
          <p className="text-xs font-semibold tracking-wider text-[var(--ops-text-muted)] uppercase">
            Summary
          </p>
          <dl className="mt-3 grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--ops-text-muted)]">Assets</dt>
              <dd className="text-[var(--ops-text)]">{summary.total_assets}</dd>
            </div>
            {summary.document_count !== undefined ? (
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--ops-text-muted)]">Documents</dt>
                <dd className="text-[var(--ops-text)]">
                  {summary.document_count}
                </dd>
              </div>
            ) : null}
          </dl>
          {summary.by_status.length > 0 ? (
            <ul className="mt-4 space-y-1">
              {summary.by_status.map((row) => (
                <li
                  key={row.status_slug}
                  className="flex items-center justify-between rounded border border-[var(--ops-border-subtle)] px-3 py-2 text-sm"
                >
                  <span className="inline-flex items-center gap-2 text-[var(--ops-text)]">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: row.color }}
                      aria-hidden
                    />
                    {row.status_name}
                  </span>
                  <span className="font-mono text-[var(--ops-text-secondary)]">
                    {row.count}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}