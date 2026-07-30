"""SQLAlchemy ORM models. Import side-effects register metadata for Alembic."""

from app.models.asset import Asset
from app.models.asset_status import AssetStatus
from app.models.asset_type import AssetType
from app.models.document import Document
from app.models.notification import Notification
from app.models.project import Project

__all__ = [
    "Asset",
    "AssetStatus",
    "AssetType",
    "Document",
    "Notification",
    "Project",
]
