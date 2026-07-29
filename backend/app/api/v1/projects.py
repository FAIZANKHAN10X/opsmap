"""Project REST endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.dependencies.db import get_db
from app.schemas.common import DataResponse, ListResponse, PaginationMeta
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate
from app.services.project import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=ListResponse[ProjectRead])
def list_projects(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=25, ge=1, le=100),
    status: str | None = None,
    db: Session = Depends(get_db),
) -> ListResponse[ProjectRead]:
    items, total = ProjectService(db).list(
        page=page,
        limit=limit,
        status=status,
    )
    return ListResponse(
        data=[ProjectRead.model_validate(item) for item in items],
        pagination=PaginationMeta.from_totals(page=page, limit=limit, total=total),
    )


@router.get("/{project_id}", response_model=DataResponse[ProjectRead])
def get_project(
    project_id: UUID,
    db: Session = Depends(get_db),
) -> DataResponse[ProjectRead]:
    project = ProjectService(db).get(project_id)
    return DataResponse(data=ProjectRead.model_validate(project))


@router.post(
    "",
    response_model=DataResponse[ProjectRead],
    status_code=status.HTTP_201_CREATED,
)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
) -> DataResponse[ProjectRead]:
    project = ProjectService(db).create(payload)
    return DataResponse(data=ProjectRead.model_validate(project))


@router.patch("/{project_id}", response_model=DataResponse[ProjectRead])
def update_project(
    project_id: UUID,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
) -> DataResponse[ProjectRead]:
    project = ProjectService(db).update(project_id, payload)
    return DataResponse(data=ProjectRead.model_validate(project))


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: UUID,
    db: Session = Depends(get_db),
) -> Response:
    ProjectService(db).delete(project_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
