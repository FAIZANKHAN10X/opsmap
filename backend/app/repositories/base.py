"""Generic repository helpers for CRUD, pagination, and soft deletes."""

from datetime import UTC, datetime
from typing import Any, Generic, TypeVar
from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.db.base import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    """Data-access base. Subclasses supply the model class only."""

    model: type[ModelT]

    def __init__(self, session: Session) -> None:
        self.session = session

    def get_by_id(
        self, entity_id: UUID, *, include_deleted: bool = False
    ) -> ModelT | None:
        stmt = select(self.model).where(self.model.id == entity_id)  # type: ignore[attr-defined]
        if not include_deleted and hasattr(self.model, "deleted_at"):
            stmt = stmt.where(self.model.deleted_at.is_(None))  # type: ignore[attr-defined]
        return self.session.scalar(stmt)

    def list(
        self,
        *,
        page: int = 1,
        limit: int = 25,
        filters: list[Any] | None = None,
        order_by: Any | None = None,
        include_deleted: bool = False,
    ) -> tuple[list[ModelT], int]:
        stmt: Select[tuple[ModelT]] = select(self.model)
        count_stmt = select(func.count()).select_from(self.model)

        if not include_deleted and hasattr(self.model, "deleted_at"):
            active = self.model.deleted_at.is_(None)  # type: ignore[attr-defined]
            stmt = stmt.where(active)
            count_stmt = count_stmt.where(active)

        if filters:
            for condition in filters:
                stmt = stmt.where(condition)
                count_stmt = count_stmt.where(condition)

        if order_by is not None:
            if isinstance(order_by, (list, tuple)):
                stmt = stmt.order_by(*order_by)
            else:
                stmt = stmt.order_by(order_by)
        elif hasattr(self.model, "created_at"):
            stmt = stmt.order_by(self.model.created_at.desc())  # type: ignore[attr-defined]

        total = int(self.session.scalar(count_stmt) or 0)
        offset = (page - 1) * limit
        items = list(self.session.scalars(stmt.offset(offset).limit(limit)).all())
        return items, total

    def add(self, entity: ModelT) -> ModelT:
        self.session.add(entity)
        self.session.flush()
        self.session.refresh(entity)
        return entity

    def delete(self, entity: ModelT, *, soft: bool = True) -> None:
        if soft and hasattr(entity, "deleted_at"):
            entity.deleted_at = datetime.now(UTC)  # type: ignore[attr-defined]
            self.session.add(entity)
            self.session.flush()
            return
        self.session.delete(entity)
        self.session.flush()

    def commit(self) -> None:
        self.session.commit()

    def refresh(self, entity: ModelT) -> ModelT:
        self.session.refresh(entity)
        return entity
