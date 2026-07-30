/**
 * Background job client (Phase 9).
 * Enqueues report/email work and polls job status — never waits on workers.
 */

import type {
  ApiSuccess,
  JobEnqueueResult,
  JobStatus,
} from "@/types/domain";

import { isoNow, mockForceError, newId } from "@/services/mock/data";
import { delay } from "@/services/mock/delay";

const USE_MOCK = true;

const mockJobs = new Map<
  string,
  JobStatus & { created_at: string; report_type?: string }
>();

export async function generateReport(input: {
  report_type?: string;
  project_id: string;
}): Promise<ApiSuccess<JobEnqueueResult>> {
  if (USE_MOCK) {
    await delay(120);
    if (mockForceError) throw new Error("Failed to enqueue report.");
    const jobId = newId("job");
    const stamp = isoNow();
    mockJobs.set(jobId, {
      id: jobId,
      status: "finished",
      description: `generate_report:${input.report_type ?? "project_summary"}`,
      enqueued_at: stamp,
      started_at: stamp,
      ended_at: stamp,
      result: {
        status: "ok",
        report_type: input.report_type ?? "project_summary",
        project_id: input.project_id,
        summary: {
          asset_count: 0,
          document_count: 0,
          assets_by_status: {},
          assets_by_type: {},
        },
      },
      error: null,
      created_at: stamp,
      report_type: input.report_type ?? "project_summary",
    });
    return {
      success: true,
      data: { job_id: jobId, status: "queued" },
      message: "Report generation queued.",
    };
  }
  throw new Error("Live API not enabled");
}

export async function getJobStatus(
  jobId: string,
): Promise<ApiSuccess<JobStatus>> {
  if (USE_MOCK) {
    await delay(80);
    const job = mockJobs.get(jobId);
    if (!job) throw new Error("Job not found.");
    return {
      success: true,
      data: {
        id: job.id,
        status: job.status,
        description: job.description,
        enqueued_at: job.enqueued_at,
        started_at: job.started_at,
        ended_at: job.ended_at,
        result: job.result,
        error: job.error,
      },
      message: null,
    };
  }
  throw new Error("Live API not enabled");
}
