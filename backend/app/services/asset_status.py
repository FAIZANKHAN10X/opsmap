"""Asset status business logic — Status Engine."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError, ValidationAppError
from app.core.status_defaults import DEFAULT_ASSET_STATUSES
from app.models.asset_status import AssetStatus
from app.repositories.asset_status import AssetStatusRepository
from app.schemas.asset_status import AssetStatusCreate, AssetStatusUpdate


class AssetStatusService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repo = AssetStatusRepository(session)

    def get(self, asset_status_id: UUID) -> AssetStatus:
        asset_status = self.repo.get_by_id(asset_status_id)
        if asset_status is None:
            raise NotFoundError("ASSET_STATUS_NOT_FOUND", "Asset status not found.")
        return asset_status

    def list(self, *, page: int, limit: int) -> tuple[list[AssetStatus], int]:
        return self.repo.list(
            page=page,
            limit=limit,
            order_by=(AssetStatus.sort_order.asc(), AssetStatus.name.asc()),
        )

    def create(self, payload: AssetStatusCreate) -> AssetStatus:
        if self.repo.exists_slug(payload.slug):
            raise ConflictError(
                "ASSET_STATUS_SLUG_EXISTS",
                "An asset status with this slug already exists.",
            )
        asset_status = AssetStatus(
            name=payload.name,
            slug=payload.slug,
            description=payload.description,
            color=payload.color,
            sort_order=payload.sort_order,
        )
        self.repo.add(asset_status)
        self.repo.commit()
        return asset_status

    def update(self, asset_status_id: UUID, payload: AssetStatusUpdate) -> AssetStatus:
        asset_status = self.get(asset_status_id)
        data = payload.model_dump(exclude_unset=True)
        if "slug" in data and data["slug"] != asset_status.slug:
            if self.repo.exists_slug(data["slug"], exclude_id=asset_status.id):
                raise ConflictError(
                    "ASSET_STATUS_SLUG_EXISTS",
                    "An asset status with this slug already exists.",
                )
        for key, value in data.items():
            setattr(asset_status, key, value)
        self.session.add(asset_status)
        self.session.commit()
        self.session.refresh(asset_status)
        return asset_status

    def delete(self, asset_status_id: UUID) -> None:
        """Soft-delete a status. Blocked while assets still use it."""
        asset_status = self.get(asset_status_id)
        in_use = self.repo.count_assets_using(asset_status_id)
        if in_use > 0:
            raise ValidationAppError(
                f"Cannot delete status while {in_use} asset(s) still use it.",
                fields=[
                    {
                        "field": "id",
                        "message": "Reassign assets before deleting this status.",
                    }
                ],
            )
        self.repo.delete(asset_status, soft=True)
        self.repo.commit()

    def seed_defaults(self) -> list[AssetStatus]:
        """Create any missing default statuses. Idempotent — never overwrites."""
        created: list[AssetStatus] = []
        for item in DEFAULT_ASSET_STATUSES:
            if self.repo.exists_slug(item["slug"]):
                continue
            status = AssetStatus(
                name=item["name"],
                slug=item["slug"],
                description=item["description"],
                color=item["color"],
                sort_order=item["sort_order"],
            )
            self.repo.add(status)
            created.append(status)
        if created:
            self.repo.commit()
            for status in created:
                self.session.refresh(status)
        return created
