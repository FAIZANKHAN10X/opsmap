"""Asset business logic."""

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.asset import Asset
from app.repositories.asset import AssetRepository
from app.repositories.asset_status import AssetStatusRepository
from app.repositories.asset_type import AssetTypeRepository
from app.repositories.project import ProjectRepository
from app.schemas.asset import AssetCreate, AssetUpdate


class AssetService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repo = AssetRepository(session)
        self.projects = ProjectRepository(session)
        self.asset_types = AssetTypeRepository(session)
        self.asset_statuses = AssetStatusRepository(session)

    def get(self, asset_id: UUID) -> Asset:
        asset = self.repo.get_by_id(asset_id)
        if asset is None:
            raise NotFoundError("ASSET_NOT_FOUND", "Asset not found.")
        return asset

    def list(
        self,
        *,
        page: int,
        limit: int,
        project_id: UUID | None = None,
        asset_type_id: UUID | None = None,
        asset_status_id: UUID | None = None,
        search: str | None = None,
    ) -> tuple[list[Asset], int]:
        if project_id is not None:
            self._require_project(project_id)
        return self.repo.list_filtered(
            page=page,
            limit=limit,
            project_id=project_id,
            asset_type_id=asset_type_id,
            asset_status_id=asset_status_id,
            search=search,
        )

    def create(self, payload: AssetCreate) -> Asset:
        self._require_project(payload.project_id)
        self._validate_type_and_status(
            asset_type_id=payload.asset_type_id,
            asset_status_id=payload.asset_status_id,
        )
        asset = Asset(
            project_id=payload.project_id,
            name=payload.name,
            code=payload.code,
            description=payload.description,
            asset_type_id=payload.asset_type_id,
            asset_status_id=payload.asset_status_id,
            metadata_=payload.metadata,
        )
        self.repo.add(asset)
        self.repo.commit()
        return asset

    def update(self, asset_id: UUID, payload: AssetUpdate) -> Asset:
        asset = self.get(asset_id)
        self._require_project(asset.project_id)
        data = payload.model_dump(exclude_unset=True)

        next_type = data.get("asset_type_id", asset.asset_type_id)
        next_status = data.get("asset_status_id", asset.asset_status_id)
        if "asset_type_id" in data or "asset_status_id" in data:
            self._validate_type_and_status(
                asset_type_id=next_type,
                asset_status_id=next_status,
            )

        if "metadata" in data:
            asset.metadata_ = data.pop("metadata") or {}

        for key, value in data.items():
            setattr(asset, key, value)

        self.session.add(asset)
        self.session.commit()
        self.session.refresh(asset)
        return asset

    def delete(self, asset_id: UUID) -> None:
        asset = self.get(asset_id)
        self.repo.delete(asset, soft=True)
        self.repo.commit()

    def _require_project(self, project_id: UUID):
        project = self.projects.get_by_id(project_id)
        if project is None:
            raise NotFoundError("PROJECT_NOT_FOUND", "Project not found.")
        return project

    def _validate_type_and_status(
        self,
        *,
        asset_type_id: UUID | None,
        asset_status_id: UUID | None,
    ) -> None:
        if asset_type_id is not None:
            asset_type = self.asset_types.get_by_id(asset_type_id)
            if asset_type is None:
                raise NotFoundError("ASSET_TYPE_NOT_FOUND", "Asset type not found.")
        if asset_status_id is not None:
            asset_status = self.asset_statuses.get_by_id(asset_status_id)
            if asset_status is None:
                raise NotFoundError("ASSET_STATUS_NOT_FOUND", "Asset status not found.")
