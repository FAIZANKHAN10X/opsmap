"""Notification REST endpoints (Phase 10)."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.dependencies.db import get_db
from app.schemas.common import DataResponse, ListResponse, PaginationMeta
from app.schemas.notification import (
    NotificationCreate,
    NotificationRead,
    NotificationUpdate,
    UnreadCountRead,
)
from app.services.notification import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=ListResponse[NotificationRead])
def list_notifications(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=25, ge=1, le=100),
    unread_only: bool = Query(default=False),
    recipient: str | None = Query(default=None, max_length=320),
    kind: str | None = Query(default=None, max_length=32),
    db: Session = Depends(get_db),
) -> ListResponse[NotificationRead]:
    service = NotificationService(db)
    items, total = service.list(
        page=page,
        limit=limit,
        unread_only=unread_only,
        recipient=recipient,
        kind=kind,
    )
    return ListResponse(
        data=[service.to_read(item) for item in items],
        pagination=PaginationMeta.from_totals(page=page, limit=limit, total=total),
    )


@router.get("/unread-count", response_model=DataResponse[UnreadCountRead])
def unread_count(
    recipient: str | None = Query(default=None, max_length=320),
    db: Session = Depends(get_db),
) -> DataResponse[UnreadCountRead]:
    count = NotificationService(db).unread_count(recipient=recipient)
    return DataResponse(data=UnreadCountRead(count=count))


@router.post("/read-all", response_model=DataResponse[UnreadCountRead])
def mark_all_read(
    recipient: str | None = Query(default=None, max_length=320),
    db: Session = Depends(get_db),
) -> DataResponse[UnreadCountRead]:
    count = NotificationService(db).mark_all_read(recipient=recipient)
    return DataResponse(
        data=UnreadCountRead(count=count),
        message="Marked notifications as read.",
    )


@router.post(
    "",
    response_model=DataResponse[NotificationRead],
    status_code=status.HTTP_201_CREATED,
)
def create_notification(
    payload: NotificationCreate,
    db: Session = Depends(get_db),
) -> DataResponse[NotificationRead]:
    """Create a notification (system/admin path). Assignment alerts are automatic."""
    service = NotificationService(db)
    notification = service.create(payload)
    return DataResponse(data=service.to_read(notification))


@router.get("/{notification_id}", response_model=DataResponse[NotificationRead])
def get_notification(
    notification_id: UUID,
    db: Session = Depends(get_db),
) -> DataResponse[NotificationRead]:
    service = NotificationService(db)
    notification = service.get(notification_id)
    return DataResponse(data=service.to_read(notification))


@router.patch("/{notification_id}", response_model=DataResponse[NotificationRead])
def update_notification(
    notification_id: UUID,
    payload: NotificationUpdate,
    db: Session = Depends(get_db),
) -> DataResponse[NotificationRead]:
    """Mark a notification read or unread."""
    service = NotificationService(db)
    notification = service.mark_read(notification_id, read=payload.read)
    return DataResponse(data=service.to_read(notification))
