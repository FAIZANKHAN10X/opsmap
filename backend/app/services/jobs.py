"""Job orchestration — enqueue background work without blocking HTTP handlers."""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from rq.job import Job

from app.core.queue import enqueue, fetch_job, ping_redis
from app.tasks import email as email_tasks
from app.tasks import images as image_tasks
from app.tasks import reports as report_tasks

logger = logging.getLogger(__name__)


class JobService:
    """Thin facade used by API routes and domain services."""

    def enqueue_image_processing(self, document_id: UUID) -> str | None:
        """Queue resize + thumbnail for an uploaded image document."""
        job = enqueue(
            image_tasks.process_document_image,
            str(document_id),
            description=f"process_document_image:{document_id}",
        )
        return job.id if job else None

    def enqueue_email(
        self,
        *,
        to: str,
        subject: str,
        body: str,
        html_body: str | None = None,
    ) -> str | None:
        job = enqueue(
            email_tasks.send_email,
            to=to,
            subject=subject,
            body=body,
            html_body=html_body,
            description=f"send_email:{to}",
        )
        return job.id if job else None

    def enqueue_report(
        self,
        *,
        report_type: str,
        project_id: UUID | None = None,
        requested_by: str | None = None,
    ) -> str | None:
        job = enqueue(
            report_tasks.generate_report,
            report_type=report_type,
            project_id=str(project_id) if project_id else None,
            requested_by=requested_by,
            description=f"generate_report:{report_type}",
            job_timeout="15m",
        )
        return job.id if job else None

    def get_job_status(self, job_id: str) -> dict[str, Any] | None:
        """Return a serializable status dict, or None if the job is unknown."""
        job = fetch_job(job_id)
        if job is None:
            return None
        return self._serialize_job(job)

    def redis_available(self) -> bool:
        return ping_redis()

    @staticmethod
    def _serialize_job(job: Job) -> dict[str, Any]:
        status = job.get_status(refresh=True)
        # RQ 2.x may return a JobStatus enum — normalize to a plain string.
        status_str = status.value if hasattr(status, "value") else str(status)
        result = None
        error = None
        if status_str == "finished":
            result = job.result
        elif status_str == "failed":
            error = str(job.exc_info) if job.exc_info else "Job failed."

        return {
            "id": job.id,
            "status": status_str,
            "description": job.description,
            "enqueued_at": job.enqueued_at.isoformat() if job.enqueued_at else None,
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "ended_at": job.ended_at.isoformat() if job.ended_at else None,
            "result": result,
            "error": error,
        }
