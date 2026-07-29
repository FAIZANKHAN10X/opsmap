"""Document metadata business logic (no binary upload in this phase)."""

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.document import Document
from app.repositories.asset import AssetRepository
from app.repositories.document import DocumentRepository
from app.schemas.document import DocumentCreate, DocumentUpdate


class DocumentService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repo = DocumentRepository(session)
        self.assets = AssetRepository(session)

    def get(self, document_id: UUID) -> Document:
        document = self.repo.get_by_id(document_id)
        if document is None:
            raise NotFoundError("DOCUMENT_NOT_FOUND", "Document not found.")
        return document

    def list_for_asset(
        self,
        asset_id: UUID,
        *,
        page: int,
        limit: int,
    ) -> tuple[list[Document], int]:
        self._require_asset(asset_id)
        return self.repo.list_by_asset(asset_id, page=page, limit=limit)

    def create(self, payload: DocumentCreate) -> Document:
        self._require_asset(payload.asset_id)
        document = Document(
            asset_id=payload.asset_id,
            name=payload.name,
            filename=payload.filename,
            mime_type=payload.mime_type,
            size_bytes=payload.size_bytes,
            storage_path=payload.storage_path,
            notes=payload.notes,
        )
        self.repo.add(document)
        self.repo.commit()
        return document

    def update(self, document_id: UUID, payload: DocumentUpdate) -> Document:
        document = self.get(document_id)
        data = payload.model_dump(exclude_unset=True)
        for key, value in data.items():
            setattr(document, key, value)
        self.session.add(document)
        self.session.commit()
        self.session.refresh(document)
        return document

    def delete(self, document_id: UUID) -> None:
        document = self.get(document_id)
        self.repo.delete(document, soft=True)
        self.repo.commit()

    def _require_asset(self, asset_id: UUID) -> None:
        if self.assets.get_by_id(asset_id) is None:
            raise NotFoundError("ASSET_NOT_FOUND", "Asset not found.")
