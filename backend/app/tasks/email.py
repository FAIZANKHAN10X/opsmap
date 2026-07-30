"""Email delivery jobs.

Phase 9 provides the non-blocking job path. Real notification product
features (assignment alerts, in-app inbox) belong to Phase 10.
Without SMTP configuration the job validates input and logs delivery intent.
"""

from __future__ import annotations

import logging
import re
import smtplib
from email.message import EmailMessage
from typing import Any

from app.core.settings import get_settings

logger = logging.getLogger(__name__)

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def send_email(
    *,
    to: str,
    subject: str,
    body: str,
    html_body: str | None = None,
) -> dict[str, Any]:
    """Send an email asynchronously via SMTP when configured.

    Workers must validate queued data — never trust enqueue arguments blindly.
    """
    to_addr = (to or "").strip()
    subject_text = (subject or "").strip()
    body_text = body or ""

    if not to_addr or not _EMAIL_RE.match(to_addr):
        logger.warning("email_job_invalid_recipient", extra={"to": to})
        return {"status": "failed", "reason": "invalid_recipient"}

    if not subject_text:
        logger.warning("email_job_missing_subject", extra={"to": to_addr})
        return {"status": "failed", "reason": "missing_subject"}

    if len(subject_text) > 200:
        subject_text = subject_text[:200]
    if len(body_text) > 50_000:
        body_text = body_text[:50_000]

    settings = get_settings()

    if not settings.smtp_host:
        # Dev / unconfigured: record intent without blocking.
        logger.info(
            "email_job_logged",
            extra={
                "to": to_addr,
                "subject": subject_text,
                "body_length": len(body_text),
                "has_html": bool(html_body),
                "mode": "log_only",
            },
        )
        return {
            "status": "ok",
            "mode": "log_only",
            "to": to_addr,
            "subject": subject_text,
        }

    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = to_addr
    message["Subject"] = subject_text
    message.set_content(body_text)
    if html_body:
        message.add_alternative(html_body, subtype="html")

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(message)
    except (smtplib.SMTPException, OSError) as exc:
        logger.error(
            "email_job_smtp_failed",
            extra={"to": to_addr, "error": str(exc)},
        )
        raise

    logger.info(
        "email_job_sent",
        extra={"to": to_addr, "subject": subject_text, "mode": "smtp"},
    )
    return {
        "status": "ok",
        "mode": "smtp",
        "to": to_addr,
        "subject": subject_text,
    }
