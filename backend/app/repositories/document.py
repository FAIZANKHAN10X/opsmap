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
    ) -> tuple[list[Document], int]:
        return self.list(
            page=page,
            limit=limit,
            filters=[Document.asset_id == asset_id],
            order_by=Document.created_at.desc(),
        )
