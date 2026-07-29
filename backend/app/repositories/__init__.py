"""Data-access repositories. No business rules."""

from app.repositories.asset import AssetRepository
from app.repositories.asset_status import AssetStatusRepository
from app.repositories.asset_type import AssetTypeRepository
from app.repositories.document import DocumentRepository
from app.repositories.project import ProjectRepository

__all__ = [
    "AssetRepository",
    "AssetStatusRepository",
    "AssetTypeRepository",
    "DocumentRepository",
    "ProjectRepository",
]
