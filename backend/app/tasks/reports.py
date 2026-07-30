"""Report generation jobs.

Long-running report assembly must never run inside an HTTP request.
The worker writes a JSON summary under upload_dir/reports/.
"""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import UUID

from sqlalchemy import func, select

from app.core.settings import get_settings
from app.db.database import get_session_factory
from app.models.asset import Asset
from app.models.asset_status import AssetStatus
from app.models.asset_type import AssetType
from app.models.document import Document
from app.models.project import Project

logger = logging.getLogger(__name__)

ALLOWED_REPORT_TYPES = frozenset({"project_summary"})


def generate_report(
    *,
    report_type: str,
    project_id: str | None = None,
    requested_by: str | None = None,
) -> dict[str, Any]:
    """Generate a report file and return metadata about the result."""
    report_type = (report_type or "").strip().lower()
    if report_type not in ALLOWED_REPORT_TYPES:
        logger.warning(
            "report_job_invalid_type",
            extra={"report_type": report_type},
        )
        return {"status": "failed", "reason": "invalid_report_type"}

    if report_type == "project_summary":
        if not project_id:
            return {"status": "failed", "reason": "project_id_required"}
        return _generate_project_summary(
            project_id=project_id,
            requested_by=requested_by,
        )

    return {"status": "failed", "reason": "unhandled_report_type"}


def _generate_project_summary(
    *,
    project_id: str,
    requested_by: str | None,
) -> dict[str, Any]:
    try:
        project_uuid = UUID(project_id)
    except ValueError:
        return {"status": "failed", "reason": "invalid_project_id"}

    session_factory = get_session_factory()
    session = session_factory()
    try:
        project = session.get(Project, project_uuid)
        if project is None or getattr(project, "deleted_at", None) is not None:
            return {"status": "failed", "reason": "project_not_found"}

        asset_count = (
            session.scalar(
                select(func.count())
                .select_from(Asset)
                .where(Asset.project_id == project_uuid, Asset.deleted_at.is_(None))
            )
            or 0
        )

        # Assets by status
        status_rows = session.execute(
            select(AssetStatus.name, func.count())
            .select_from(Asset)
            .outerjoin(AssetStatus, Asset.asset_status_id == AssetStatus.id)
            .where(Asset.project_id == project_uuid, Asset.deleted_at.is_(None))
            .group_by(AssetStatus.name)
        ).all()
        by_status = {(name or "Unassigned"): count for name, count in status_rows}

        # Assets by type
        type_rows = session.execute(
            select(AssetType.name, func.count())
            .select_from(Asset)
            .outerjoin(AssetType, Asset.asset_type_id == AssetType.id)
            .where(Asset.project_id == project_uuid, Asset.deleted_at.is_(None))
            .group_by(AssetType.name)
        ).all()
        by_type = {(name or "Unassigned"): count for name, count in type_rows}

        # Documents attached to assets in this project
        document_count = (
            session.scalar(
                select(func.count())
                .select_from(Document)
                .join(Asset, Document.asset_id == Asset.id)
                .where(
                    Asset.project_id == project_uuid,
                    Asset.deleted_at.is_(None),
                    Document.deleted_at.is_(None),
                )
            )
            or 0
        )

        generated_at = datetime.now(UTC).isoformat()
        payload: dict[str, Any] = {
            "report_type": "project_summary",
            "generated_at": generated_at,
            "requested_by": requested_by,
            "project": {
                "id": str(project.id),
                "name": project.name,
                "slug": project.slug,
                "status": project.status,
            },
            "summary": {
                "asset_count": int(asset_count),
                "document_count": int(document_count),
                "assets_by_status": by_status,
                "assets_by_type": by_type,
            },
        }

        settings = get_settings()
        reports_root = Path(settings.upload_dir).resolve() / settings.report_dir
        reports_root.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
        filename = f"project_summary_{project.slug}_{stamp}.json"
        out_path = reports_root / filename
        out_path.write_text(
            json.dumps(payload, indent=2, default=str),
            encoding="utf-8",
        )

        relative = f"{settings.report_dir}/{filename}"
        logger.info(
            "report_job_completed",
            extra={
                "report_type": "project_summary",
                "project_id": project_id,
                "path": relative,
            },
        )
        return {
            "status": "ok",
            "report_type": "project_summary",
            "project_id": project_id,
            "path": relative,
            "absolute_path": str(out_path),
            "generated_at": generated_at,
            "summary": payload["summary"],
        }
    except Exception:
        logger.exception(
            "report_job_error",
            extra={"project_id": project_id},
        )
        raise
    finally:
        session.close()
