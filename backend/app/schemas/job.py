"""Background job status and report enqueue schemas (Phase 9)."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import Field, field_validator

from app.schemas.common import ORMModel
from app.tasks.reports import ALLOWED_REPORT_TYPES


class JobStatusRead(ORMModel):
    id: str
    status: str
    description: str | None = None
    enqueued_at: str | None = None
    started_at: str | None = None
    ended_at: str | None = None
    result: Any = None
    error: str | None = None


class JobEnqueueResult(ORMModel):
    job_id: str
    status: str = "queued"


class ReportGenerateRequest(ORMModel):
    report_type: str = Field(default="project_summary", max_length=64)
    project_id: UUID | None = None

    @field_validator("report_type")
    @classmethod
    def validate_report_type(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if cleaned not in ALLOWED_REPORT_TYPES:
            raise ValueError(
                f"report_type must be one of: {', '.join(sorted(ALLOWED_REPORT_TYPES))}"
            )
        return cleaned


class EmailEnqueueRequest(ORMModel):
    """Internal test/admin path for the email job. Not a notification product."""

    to: str = Field(min_length=3, max_length=320)
    subject: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=50_000)
