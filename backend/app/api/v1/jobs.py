"""Job status and enqueue endpoints for background work (Phase 9)."""

from __future__ import annotations

from fastapi import APIRouter, status

from app.core.exceptions import NotFoundError, ValidationAppError
from app.schemas.common import DataResponse
from app.schemas.job import (
    EmailEnqueueRequest,
    JobEnqueueResult,
    JobStatusRead,
    ReportGenerateRequest,
)
from app.services.jobs import JobService

router = APIRouter(tags=["jobs"])


@router.get(
    "/jobs/{job_id}",
    response_model=DataResponse[JobStatusRead],
)
def get_job_status(job_id: str) -> DataResponse[JobStatusRead]:
    """Poll RQ job status. Never blocks on job execution."""
    service = JobService()
    if not service.redis_available():
        raise ValidationAppError(
            "Background job service is unavailable.",
            fields=[{"field": "redis", "message": "Redis is not reachable."}],
        )
    payload = service.get_job_status(job_id)
    if payload is None:
        raise NotFoundError("JOB_NOT_FOUND", "Job not found.")
    return DataResponse(data=JobStatusRead.model_validate(payload))


@router.post(
    "/reports/generate",
    response_model=DataResponse[JobEnqueueResult],
    status_code=status.HTTP_202_ACCEPTED,
)
def generate_report(
    payload: ReportGenerateRequest,
) -> DataResponse[JobEnqueueResult]:
    """Enqueue report generation and return immediately with a job id."""
    if payload.report_type == "project_summary" and payload.project_id is None:
        raise ValidationAppError(
            "project_id is required for project_summary reports.",
            fields=[{"field": "project_id", "message": "Required."}],
        )

    service = JobService()
    job_id = service.enqueue_report(
        report_type=payload.report_type,
        project_id=payload.project_id,
    )
    if job_id is None:
        raise ValidationAppError(
            "Could not enqueue report job. Is Redis running?",
            fields=[{"field": "redis", "message": "Enqueue failed."}],
        )
    return DataResponse(
        data=JobEnqueueResult(job_id=job_id, status="queued"),
        message="Report generation queued.",
    )


@router.post(
    "/jobs/email",
    response_model=DataResponse[JobEnqueueResult],
    status_code=status.HTTP_202_ACCEPTED,
)
def enqueue_email(
    payload: EmailEnqueueRequest,
) -> DataResponse[JobEnqueueResult]:
    """Enqueue an email job (infrastructure path for Phase 9 email workers)."""
    service = JobService()
    job_id = service.enqueue_email(
        to=payload.to,
        subject=payload.subject,
        body=payload.body,
    )
    if job_id is None:
        raise ValidationAppError(
            "Could not enqueue email job. Is Redis running?",
            fields=[{"field": "redis", "message": "Enqueue failed."}],
        )
    return DataResponse(
        data=JobEnqueueResult(job_id=job_id, status="queued"),
        message="Email job queued.",
    )
