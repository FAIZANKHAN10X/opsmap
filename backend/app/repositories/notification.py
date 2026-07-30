"""Notification data access."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select

from app.models.notification import Notification
from app.repositories.base import BaseRepository


class NotificationRepository(BaseRepository[Notification]):
    model = Notification

    def list_filtered(
        self,
        *,
        page: int,
        limit: int,
        unread_only: bool = False,
        recipient: str | None = None,
        kind: str | None = None,
    ) -> tuple[list[Notification], int]:
        filters = []
        if unread_only:
            filters.append(Notification.read_at.is_(None))
        if recipient:
            filters.append(Notification.recipient == recipient.strip())
        if kind:
            filters.append(Notification.kind == kind)
        return self.list(
            page=page,
            limit=limit,
            filters=filters,
            order_by=Notification.created_at.desc(),
        )

    def count_unread(self, *, recipient: str | None = None) -> int:
        stmt = (
            select(func.count())
            .select_from(Notification)
            .where(Notification.read_at.is_(None))
        )
        if recipient:
            stmt = stmt.where(Notification.recipient == recipient.strip())
        return int(self.session.scalar(stmt) or 0)

    def mark_read(self, notification: Notification) -> Notification:
        if notification.read_at is None:
            notification.read_at = datetime.now(UTC)
            self.session.add(notification)
            self.session.flush()
        return notification

    def mark_all_read(self, *, recipient: str | None = None) -> int:
        stmt = select(Notification).where(Notification.read_at.is_(None))
        if recipient:
            stmt = stmt.where(Notification.recipient == recipient.strip())
        items = list(self.session.scalars(stmt).all())
        now = datetime.now(UTC)
        for item in items:
            item.read_at = now
            self.session.add(item)
        self.session.flush()
        return len(items)

    def get_by_id_simple(self, entity_id: UUID) -> Notification | None:
        return self.session.get(Notification, entity_id)
