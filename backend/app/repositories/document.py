"""Document metadata data access."""

from uuid import UUID

from sqlalchemy.orm import Session

from app.models.document import Document
from app.repositories.base import BaseRepository


class DocumentRepository(BaseRepository[Document]):
    model = Document

    def __init__(self, session: Session) -> None:
        super().__init__(session)

    def list_by_asset(
        self,
        asset_id: UUID,
        *,
        page: int = 1,
        limit: int = 25,
        category: str | None = None,
    ) -> tuple[list[Document], int]:
        filters = [Document.asset_id == asset_id]
        if category:
            filters.append(Document.category == category)
        return self.list(
            page=page,
            limit=limit,
            filters=filters,
            order_by=Document.created_at.desc(),
        )

    def list_all(
        self,
        *,
        page: int = 1,
        limit: int = 25,
        asset_id: UUID | None = None,
        category: str | None = None,
        search: str | None = None,
    ) -> tuple[list[Document], int]:
        filters = []
        if asset_id is not None:
            filters.append(Document.asset_id == asset_id)
        if category:
            filters.append(Document.category == category)
        if search and search.strip():
            pattern = f"%{search.strip()}%"
            from sqlalchemy import or_

            filters.append(
                or_(
                    Document.name.ilike(pattern),
                    Document.filename.ilike(pattern),
                    Document.notes.ilike(pattern),
                )
            )
        return self.list(
            page=page,
            limit=limit,
            filters=filters or None,
            order_by=Document.created_at.desc(),
        )
