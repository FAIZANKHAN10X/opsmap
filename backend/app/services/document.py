"""Document business logic — metadata + local file storage."""

from __future__ import annotations

from pathlib import Path
from uuid import UUID, uuid4  # noqa: F401 — uuid4 used in upload

from sqlalchemy.orm import Session

from app.core.document_constants import (
    ALLOWED_MIME_TYPES,
    DOCUMENT_CATEGORIES,
    MIME_CATEGORY_HINTS,
    PREVIEWABLE_MIME_TYPES,
)
from app.core.exceptions import NotFoundError, ValidationAppError
from app.core.settings import get_settings
from app.models.document import Document
from app.repositories.asset import AssetRepository
from app.repositories.document import DocumentRepository
from app.schemas.document import DocumentCreate, DocumentRead, DocumentUpdate
from app.services.jobs import JobService
from app.services.storage import LocalFileStorage
from app.tasks.images import is_processable_image


class DocumentService:
    def __init__(
        self,
        session: Session,
        storage: LocalFileStorage | None = None,
    ) -> None:
        self.session = session
        self.repo = DocumentRepository(session)
        self.assets = AssetRepository(session)
        self.storage = storage or LocalFileStorage()

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
        category: str | None = None,
    ) -> tuple[list[Document], int]:
        self._require_asset(asset_id)
        if category and category not in DOCUMENT_CATEGORIES:
            raise ValidationAppError(
                "Invalid category.",
                fields=[{"field": "category", "message": "Unknown category."}],
            )
        return self.repo.list_by_asset(
            asset_id,
            page=page,
            limit=limit,
            category=category,
        )

    def list_all(
        self,
        *,
        page: int,
        limit: int,
        asset_id: UUID | None = None,
        category: str | None = None,
        search: str | None = None,
    ) -> tuple[list[Document], int]:
        if asset_id is not None:
            self._require_asset(asset_id)
        if category and category not in DOCUMENT_CATEGORIES:
            raise ValidationAppError(
                "Invalid category.",
                fields=[{"field": "category", "message": "Unknown category."}],
            )
        return self.repo.list_all(
            page=page,
            limit=limit,
            asset_id=asset_id,
            category=category,
            search=search,
        )

    def create(self, payload: DocumentCreate) -> Document:
        """Metadata-only create (no binary). Prefer upload()."""
        self._require_asset(payload.asset_id)
        document = Document(
            asset_id=payload.asset_id,
            name=payload.name,
            filename=payload.filename,
            mime_type=payload.mime_type,
            size_bytes=payload.size_bytes,
            storage_path=payload.storage_path,
            category=payload.category,
            notes=payload.notes,
        )
        self.repo.add(document)
        self.repo.commit()
        return document

    def upload(
        self,
        *,
        asset_id: UUID,
        filename: str,
        content_type: str | None,
        data: bytes,
        name: str | None = None,
        category: str | None = None,
        notes: str | None = None,
    ) -> Document:
        self._require_asset(asset_id)
        settings = get_settings()

        if not data:
            raise ValidationAppError(
                "Empty file.",
                fields=[{"field": "file", "message": "File is empty."}],
            )
        if len(data) > settings.max_upload_bytes:
            raise ValidationAppError(
                f"File exceeds maximum size of {settings.max_upload_bytes} bytes.",
                fields=[{"field": "file", "message": "File too large."}],
            )

        mime = (
            (content_type or "application/octet-stream").split(";")[0].strip().lower()
        )
        if mime not in ALLOWED_MIME_TYPES:
            raise ValidationAppError(
                "File type is not allowed.",
                fields=[
                    {
                        "field": "file",
                        "message": f"Allowed types: {', '.join(sorted(ALLOWED_MIME_TYPES))}",
                    }
                ],
            )

        resolved_category = (category or MIME_CATEGORY_HINTS.get(mime, "other")).lower()
        if resolved_category not in DOCUMENT_CATEGORIES:
            raise ValidationAppError(
                "Invalid category.",
                fields=[{"field": "category", "message": "Unknown category."}],
            )

        display_name = (name or Path(filename).stem or "Document").strip()
        safe_filename = Path(filename).name or "file"

        document_id = uuid4()
        relative = self.storage.build_relative_path(
            asset_id=asset_id,
            document_id=document_id,
            filename=safe_filename,
        )
        size = self.storage.save(relative_path=relative, data=data)

        document = Document(
            id=document_id,
            asset_id=asset_id,
            name=display_name[:255],
            filename=safe_filename[:512],
            mime_type=mime,
            size_bytes=size,
            storage_path=relative,
            category=resolved_category,
            notes=notes,
        )
        self.repo.add(document)
        self.repo.commit()

        # Phase 9: expensive image work never blocks the upload response.
        if is_processable_image(mime):
            JobService().enqueue_image_processing(document.id)

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
        paths = [
            document.storage_path,
            document.thumbnail_path,
            document.resized_path,
        ]
        self.repo.delete(document, soft=True)
        self.repo.commit()
        # Remove binaries after metadata soft-delete succeeds.
        for path in paths:
            try:
                self.storage.delete(path)
            except ValueError:
                pass

    def read_file(self, document_id: UUID) -> tuple[Document, bytes]:
        document = self.get(document_id)
        if not document.storage_path:
            raise NotFoundError(
                "FILE_NOT_FOUND", "No file is stored for this document."
            )
        try:
            data = self.storage.read(document.storage_path)
        except FileNotFoundError as exc:
            raise NotFoundError(
                "FILE_NOT_FOUND",
                "Stored file is missing from disk.",
            ) from exc
        return document, data

    def to_read(self, document: Document) -> DocumentRead:
        mime = document.mime_type or ""
        return DocumentRead(
            id=document.id,
            asset_id=document.asset_id,
            name=document.name,
            filename=document.filename,
            mime_type=document.mime_type,
            size_bytes=document.size_bytes,
            storage_path=document.storage_path,
            thumbnail_path=document.thumbnail_path,
            resized_path=document.resized_path,
            category=document.category or "other",
            notes=document.notes,
            created_at=document.created_at,
            updated_at=document.updated_at,
            is_previewable=mime in PREVIEWABLE_MIME_TYPES
            and bool(document.storage_path),
            has_file=bool(document.storage_path),
            has_thumbnail=bool(document.thumbnail_path),
        )

    def _require_asset(self, asset_id: UUID) -> None:
        if self.assets.get_by_id(asset_id) is None:
            raise NotFoundError("ASSET_NOT_FOUND", "Asset not found.")
