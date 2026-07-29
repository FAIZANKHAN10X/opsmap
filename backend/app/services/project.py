"""Project business logic."""

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models.project import Project
from app.repositories.project import ProjectRepository
from app.schemas.project import ProjectCreate, ProjectUpdate


class ProjectService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repo = ProjectRepository(session)

    def get(self, project_id: UUID) -> Project:
        project = self.repo.get_by_id(project_id)
        if project is None:
            raise NotFoundError("PROJECT_NOT_FOUND", "Project not found.")
        return project

    def list(
        self,
        *,
        page: int,
        limit: int,
        status: str | None = None,
    ) -> tuple[list[Project], int]:
        filters = []
        if status is not None:
            filters.append(Project.status == status)
        return self.repo.list(page=page, limit=limit, filters=filters or None)

    def create(self, payload: ProjectCreate) -> Project:
        if self.repo.exists_slug(payload.slug):
            raise ConflictError(
                "PROJECT_SLUG_EXISTS",
                "A project with this slug already exists.",
            )
        project = Project(
            name=payload.name,
            slug=payload.slug,
            description=payload.description,
            status=payload.status,
        )
        self.repo.add(project)
        self.repo.commit()
        return project

    def update(self, project_id: UUID, payload: ProjectUpdate) -> Project:
        project = self.get(project_id)
        data = payload.model_dump(exclude_unset=True)
        if "slug" in data and data["slug"] != project.slug:
            if self.repo.exists_slug(data["slug"], exclude_id=project.id):
                raise ConflictError(
                    "PROJECT_SLUG_EXISTS",
                    "A project with this slug already exists.",
                )
        for key, value in data.items():
            setattr(project, key, value)
        self.session.add(project)
        self.session.commit()
        self.session.refresh(project)
        return project

    def delete(self, project_id: UUID) -> None:
        project = self.get(project_id)
        self.repo.delete(project, soft=True)
        self.repo.commit()
