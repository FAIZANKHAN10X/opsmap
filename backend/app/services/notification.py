"""Notification business logic — in-app alerts and email via RQ (Phase 10)."""

from __future__ import annotations

import logging
import re
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, ValidationAppError
from app.core.notification_constants import (
    NOTIFICATION_KINDS,
)
from app.models.asset import Asset
from app.models.notification import Notification
from app.repositories.notification import NotificationRepository
from app.schemas.notification import NotificationCreate, NotificationRead
from app.services.jobs import JobService

logger = logging.getLogger(__name__)

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def looks_like_email(value: str | None) -> bool:
    if not value:
        return False
    return bool(_EMAIL_RE.match(value.strip()))


class NotificationService:
    def __init__(self, session: Session, jobs: JobService | None = None) -> None:
        self.session = session
        self.repo = NotificationRepository(session)
        self.jobs = jobs or JobService()

    def get(self, notification_id: UUID) -> Notification:
        notification = self.repo.get_by_id_simple(notification_id)
        if notification is None:
            raise NotFoundError("NOTIFICATION_NOT_FOUND", "Notification not found.")
        return notification

    def list(
        self,
        *,
        page: int,
        limit: int,
        unread_only: bool = False,
        recipient: str | None = None,
        kind: str | None = None,
    ) -> tuple[list[Notification], int]:
        if kind and kind not in NOTIFICATION_KINDS:
            raise ValidationAppError(
                "Invalid kind.",
                fields=[{"field": "kind", "message": "Unknown notification kind."}],
            )
        return self.repo.list_filtered(
            page=page,
            limit=limit,
            unread_only=unread_only,
            recipient=recipient,
            kind=kind,
        )

    def unread_count(self, *, recipient: str | None = None) -> int:
        return self.repo.count_unread(recipient=recipient)

    def create(self, payload: NotificationCreate) -> Notification:
        notification = Notification(
            severity=payload.severity,
            kind=payload.kind,
            title=payload.title,
            message=payload.message,
            recipient=payload.recipient,
            recipient_email=payload.recipient_email,
            entity_type=payload.entity_type,
            entity_id=payload.entity_id,
            metadata_=payload.metadata or {},
        )
        self.repo.add(notification)
        self.repo.commit()
        return notification

    def mark_read(self, notification_id: UUID, *, read: bool = True) -> Notification:
        notification = self.get(notification_id)
        if read:
            self.repo.mark_read(notification)
        else:
            notification.read_at = None
            self.session.add(notification)
            self.session.flush()
        self.repo.commit()
        self.session.refresh(notification)
        return notification

    def mark_all_read(self, *, recipient: str | None = None) -> int:
        count = self.repo.mark_all_read(recipient=recipient)
        self.repo.commit()
        return count

    def notify_asset_assignments(
        self,
        asset: Asset,
        *,
        new_assignees: list[str],
        previous_assignees: list[str] | None = None,
    ) -> list[Notification]:
        """Create assignment alerts for newly added assignees and queue emails.

        Email is enqueued only when the assignee string looks like an address.
        In-app notifications are always created for new assignees.
        """
        previous = set(previous_assignees or [])
        added = [name for name in new_assignees if name and name not in previous]
        if not added:
            return []

        created: list[Notification] = []
        asset_label = asset.code or asset.name

        for assignee in added:
            email = assignee.strip() if looks_like_email(assignee) else None
            title = f"Assigned to {asset_label}"
            message = (
                f"You were assigned to asset “{asset.name}”"
                + (f" ({asset.code})" if asset.code else "")
                + "."
            )
            metadata: dict[str, Any] = {
                "asset_id": str(asset.id),
                "asset_name": asset.name,
                "asset_code": asset.code,
                "project_id": str(asset.project_id),
                "assignee": assignee,
            }

            notification = Notification(
                severity="info",
                kind="assignment",
                title=title[:255],
                message=message,
                recipient=assignee.strip(),
                recipient_email=email,
                entity_type="asset",
                entity_id=asset.id,
                metadata_=metadata,
            )
            self.repo.add(notification)
            created.append(notification)

            if email:
                job_id = self.jobs.enqueue_email(
                    to=email,
                    subject=title[:200],
                    body=(
                        f"{message}\n\n"
                        f"Asset: {asset.name}\n"
                        f"Code: {asset.code or '—'}\n"
                        f"Project ID: {asset.project_id}\n\n"
                        "— OpsMap"
                    ),
                )
                if job_id:
                    metadata["email_job_id"] = job_id
                    notification.metadata_ = dict(metadata)
                    logger.info(
                        "assignment_email_queued",
                        extra={
                            "asset_id": str(asset.id),
                            "to": email,
                            "job_id": job_id,
                        },
                    )
                else:
                    logger.warning(
                        "assignment_email_enqueue_failed",
                        extra={"asset_id": str(asset.id), "to": email},
                    )

        self.repo.commit()
        for item in created:
            self.session.refresh(item)
        return created

    def to_read(self, notification: Notification) -> NotificationRead:
        return NotificationRead.model_validate(notification)
