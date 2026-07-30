"use client";

import { useEffect, useState } from "react";

import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/ui/Button";
import { generateReport, getJobStatus } from "@/services/jobs";
import { listProjects } from "@/services/projects";
import { useShell } from "@/stores/shell-context";
import { useToast } from "@/stores/toast-context";
import type { JobStatus } from "@/types/domain";

/**
 * Phase 9 — enqueue project summary reports asynchronously.
 * Full analytics dashboards belong to later roadmap phases.
 */
export function ReportsPage() {
  const { selectedProjectId } = useShell();
  const toast = useToast();
  const [projectName, setProjectName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<JobStatus | null>(null);
  const [lastJobId, setLastJobId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProjectId) {
      setProjectName(null);
      return;
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
      const enqueued = await generateReport({
        report_type: "project_summary",
        project_id: selectedProjectId,
      });
      setLastJobId(enqueued.data.job_id);
      const status = await getJobStatus(enqueued.data.job_id);
      setJob(status.data);
      toast.success("Report queued", "Generation runs in the background.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate report.";
      setError(message);
      setJob(null);
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

  const summary =
    job?.result &&
    typeof job.result === "object" &&
    job.result !== null &&
    "summary" in job.result
      ? (job.result as { summary: Record<string, unknown> }).summary
      : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--ops-text)]">
          Reports
        </h1>
        <p className="text-sm text-[var(--ops-text-secondary)]">
          Generate project summaries in the background. Long-running work never
          blocks the UI — jobs run on Redis + RQ workers.
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
          Counts assets by status and type, plus attached documents. Written as
          a JSON artifact by a background worker.
        </p>
        <div className="mt-4">
          <Button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={busy}
          >
            {busy ? "Queuing…" : "Generate report"}
          </Button>
        </div>
      </section>

      {error ? (
        <p className="text-sm text-[var(--ops-danger)]" role="alert">
          {error}
        </p>
      ) : null}

      {job ? (
        <section className="rounded-[var(--ops-radius-lg)] border border-[var(--ops-border)] bg-[var(--ops-surface)] p-5">
          <p className="text-xs font-semibold tracking-wider text-[var(--ops-text-muted)] uppercase">
            Job status
          </p>
          <dl className="mt-3 grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--ops-text-muted)]">Job ID</dt>
              <dd className="font-mono text-xs text-[var(--ops-text)]">
                {lastJobId}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--ops-text-muted)]">Status</dt>
              <dd className="font-medium text-[var(--ops-text)]">{job.status}</dd>
            </div>
            {summary ? (
              <>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--ops-text-muted)]">Assets</dt>
                  <dd className="text-[var(--ops-text)]">
                    {String(summary.asset_count ?? "—")}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--ops-text-muted)]">Documents</dt>
                  <dd className="text-[var(--ops-text)]">
                    {String(summary.document_count ?? "—")}
                  </dd>
                </div>
              </>
            ) : null}
          </dl>
          {job.error ? (
            <p className="mt-3 text-sm text-[var(--ops-danger)]">{job.error}</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
