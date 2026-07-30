"""Document REST endpoints — upload, download, preview, CRUD."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, Response, UploadFile, status
from fastapi.responses import Response as FastAPIResponse
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.dependencies.db import get_db
from app.schemas.common import DataResponse, ListResponse, PaginationMeta
from app.schemas.document import DocumentCreate, DocumentRead, DocumentUpdate
from app.services.document import DocumentService

router = APIRouter(tags=["documents"])


@router.get(
    "/documents",
    response_model=ListResponse[DocumentRead],
)
def list_documents(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=25, ge=1, le=100),
    asset_id: UUID | None = None,
    category: str | None = None,
    search: str | None = Query(default=None, max_length=200),
    db: Session = Depends(get_db),
) -> ListResponse[DocumentRead]:
    service = DocumentService(db)
    items, total = service.list_all(
        page=page,
        limit=limit,
        asset_id=asset_id,
        category=category,
        search=search,
    )
    return ListResponse(
        data=[service.to_read(item) for item in items],
        pagination=PaginationMeta.from_totals(page=page, limit=limit, total=total),
    )


@router.get(
    "/assets/{asset_id}/documents",
    response_model=ListResponse[DocumentRead],
)
def list_asset_documents(
    asset_id: UUID,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=25, ge=1, le=100),
    category: str | None = None,
    db: Session = Depends(get_db),
) -> ListResponse[DocumentRead]:
    service = DocumentService(db)
    items, total = service.list_for_asset(
        asset_id,
        page=page,
        limit=limit,
        category=category,
    )
    return ListResponse(
        data=[service.to_read(item) for item in items],
        pagination=PaginationMeta.from_totals(page=page, limit=limit, total=total),
    )


@router.post(
    "/documents/upload",
    response_model=DataResponse[DocumentRead],
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    asset_id: UUID = Form(...),
    file: UploadFile = File(...),
    name: str | None = Form(default=None),
    category: str | None = Form(default=None),
    notes: str | None = Form(default=None),
    db: Session = Depends(get_db),
) -> DataResponse[DocumentRead]:
    """Multipart upload — stores binary and creates document metadata."""
    data = await file.read()
    service = DocumentService(db)
    document = service.upload(
        asset_id=asset_id,
        filename=file.filename or "upload.bin",
        content_type=file.content_type,
        data=data,
        name=name,
        category=category,
        notes=notes,
    )
    return DataResponse(data=service.to_read(document))


@router.post(
    "/documents",
    response_model=DataResponse[DocumentRead],
    status_code=status.HTTP_201_CREATED,
)
def create_document(
    payload: DocumentCreate,
    db: Session = Depends(get_db),
) -> DataResponse[DocumentRead]:
    """Metadata-only create (no file bytes). Prefer /documents/upload."""
    service = DocumentService(db)
    document = service.create(payload)
    return DataResponse(data=service.to_read(document))


@router.get(
    "/documents/{document_id}",
    response_model=DataResponse[DocumentRead],
)
def get_document(
    document_id: UUID,
    db: Session = Depends(get_db),
) -> DataResponse[DocumentRead]:
    service = DocumentService(db)
    document = service.get(document_id)
    return DataResponse(data=service.to_read(document))


@router.get("/documents/{document_id}/download")
def download_document(
    document_id: UUID,
    db: Session = Depends(get_db),
) -> FastAPIResponse:
    service = DocumentService(db)
    document, data = service.read_file(document_id)
    headers = {
        "Content-Disposition": f'attachment; filename="{document.filename}"',
    }
    return FastAPIResponse(
        content=data,
        media_type=document.mime_type or "application/octet-stream",
        headers=headers,
    )


@router.get("/documents/{document_id}/preview")
def preview_document(
    document_id: UUID,
    db: Session = Depends(get_db),
) -> FastAPIResponse:
    """Inline file response for browser preview (PDF/images)."""
    service = DocumentService(db)
    document, data = service.read_file(document_id)
    headers = {
        "Content-Disposition": f'inline; filename="{document.filename}"',
    }
    return FastAPIResponse(
        content=data,
        media_type=document.mime_type or "application/octet-stream",
        headers=headers,
    )


@router.get("/documents/{document_id}/thumbnail")
def document_thumbnail(
    document_id: UUID,
    db: Session = Depends(get_db),
) -> FastAPIResponse:
    """Serve the generated thumbnail when available (Phase 9)."""
    service = DocumentService(db)
    document = service.get(document_id)
    if not document.thumbnail_path:
        raise NotFoundError(
            "THUMBNAIL_NOT_FOUND",
            "Thumbnail has not been generated for this document yet.",
        )
    try:
        data = service.storage.read(document.thumbnail_path)
    except FileNotFoundError as exc:
        raise NotFoundError(
            "THUMBNAIL_NOT_FOUND",
            "Thumbnail file is missing from disk.",
        ) from exc

    # Derivatives are jpeg/png/webp — sniff from path extension.
    path = document.thumbnail_path.lower()
    if path.endswith(".jpg") or path.endswith(".jpeg"):
        media = "image/jpeg"
    elif path.endswith(".webp"):
        media = "image/webp"
    else:
        media = "image/png"
    return FastAPIResponse(
        content=data,
        media_type=media,
        headers={"Content-Disposition": 'inline; filename="thumbnail"'},
    )


@router.patch(
    "/documents/{document_id}",
    response_model=DataResponse[DocumentRead],
)
def update_document(
    document_id: UUID,
    payload: DocumentUpdate,
    db: Session = Depends(get_db),
) -> DataResponse[DocumentRead]:
    service = DocumentService(db)
    document = service.update(document_id, payload)
    return DataResponse(data=service.to_read(document))


@router.delete(
    "/documents/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_document(
    document_id: UUID,
    db: Session = Depends(get_db),
) -> Response:
    DocumentService(db).delete(document_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
