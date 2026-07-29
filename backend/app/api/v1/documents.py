"""Document metadata REST endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.dependencies.db import get_db
from app.schemas.common import DataResponse, ListResponse, PaginationMeta
from app.schemas.document import DocumentCreate, DocumentRead, DocumentUpdate
from app.services.document import DocumentService

router = APIRouter(tags=["documents"])


@router.get(
    "/assets/{asset_id}/documents",
    response_model=ListResponse[DocumentRead],
)
def list_asset_documents(
    asset_id: UUID,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=25, ge=1, le=100),
    db: Session = Depends(get_db),
) -> ListResponse[DocumentRead]:
    items, total = DocumentService(db).list_for_asset(
        asset_id,
        page=page,
        limit=limit,
    )
    return ListResponse(
        data=[DocumentRead.model_validate(item) for item in items],
        pagination=PaginationMeta.from_totals(page=page, limit=limit, total=total),
    )


@router.post(
    "/documents",
    response_model=DataResponse[DocumentRead],
    status_code=status.HTTP_201_CREATED,
)
def create_document(
    payload: DocumentCreate,
    db: Session = Depends(get_db),
) -> DataResponse[DocumentRead]:
    document = DocumentService(db).create(payload)
    return DataResponse(data=DocumentRead.model_validate(document))


@router.get(
    "/documents/{document_id}",
    response_model=DataResponse[DocumentRead],
)
def get_document(
    document_id: UUID,
    db: Session = Depends(get_db),
) -> DataResponse[DocumentRead]:
    document = DocumentService(db).get(document_id)
    return DataResponse(data=DocumentRead.model_validate(document))


@router.patch(
    "/documents/{document_id}",
    response_model=DataResponse[DocumentRead],
)
def update_document(
    document_id: UUID,
    payload: DocumentUpdate,
    db: Session = Depends(get_db),
) -> DataResponse[DocumentRead]:
    document = DocumentService(db).update(document_id, payload)
    return DataResponse(data=DocumentRead.model_validate(document))


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
