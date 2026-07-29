"""Project data access."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.project import Project
from app.repositories.base import BaseRepository


class ProjectRepository(BaseRepository[Project]):
    model = Project

    def __init__(self, session: Session) -> None:
        super().__init__(session)

    def exists_slug(self, slug: str, *, exclude_id: UUID | None = None) -> bool:
        stmt = select(Project.id).where(
            Project.slug == slug,
            Project.deleted_at.is_(None),
        )
        if exclude_id is not None:
            stmt = stmt.where(Project.id != exclude_id)
        return self.session.scalar(stmt) is not None
