"""Background job callables.

Individual jobs (image resize, email, reports, etc.) live here.
Workers under ``app.workers`` schedule and execute these tasks via RQ.
"""

from app.tasks.email import send_email
from app.tasks.images import process_document_image
from app.tasks.reports import generate_report

__all__ = [
    "generate_report",
    "process_document_image",
    "send_email",
]
