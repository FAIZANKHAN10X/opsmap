"""Image processing jobs — resize and thumbnail generation.

Pipeline (ARCHITECTURE.md Background Job Flow):
  API stores original → enqueue → worker resizes → generates thumbnail →
  updates document.thumbnail_path / resized_path.
"""

from __future__ import annotations

import logging
from io import BytesIO
from pathlib import Path
from uuid import UUID

from PIL import Image, UnidentifiedImageError

from app.core.settings import get_settings
from app.db.database import get_session_factory
from app.models.document import Document
from app.services.storage import LocalFileStorage

logger = logging.getLogger(__name__)

# Raster formats we can process with Pillow. SVG is left as-is.
PROCESSABLE_MIME_TYPES = frozenset(
    {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
    }
)

# Map source format → preferred save format for derivatives.
_SAVE_FORMAT = {
    "JPEG": "JPEG",
    "JPG": "JPEG",
    "PNG": "PNG",
    "WEBP": "WEBP",
    "GIF": "PNG",  # flatten animated GIF to static PNG for derivatives
}


def is_processable_image(mime_type: str | None) -> bool:
    if not mime_type:
        return False
    return mime_type.split(";")[0].strip().lower() in PROCESSABLE_MIME_TYPES


def process_document_image(document_id: str) -> dict:
    """Resize large images and generate a thumbnail for a document.

    Designed to run inside an RQ worker. Opens its own DB session.
    """
    doc_uuid = UUID(document_id)
    session_factory = get_session_factory()
    session = session_factory()
    storage = LocalFileStorage()
    settings = get_settings()

    try:
        document = session.get(Document, doc_uuid)
        if document is None or document.deleted_at is not None:
            logger.warning(
                "image_job_document_missing",
                extra={"document_id": document_id},
            )
            return {"status": "skipped", "reason": "document_not_found"}

        if not is_processable_image(document.mime_type):
            return {"status": "skipped", "reason": "not_processable_image"}

        if not document.storage_path:
            return {"status": "skipped", "reason": "no_storage_path"}

        try:
            original_bytes = storage.read(document.storage_path)
        except FileNotFoundError:
            logger.error(
                "image_job_file_missing",
                extra={
                    "document_id": document_id,
                    "path": document.storage_path,
                },
            )
            return {"status": "failed", "reason": "file_missing"}

        try:
            image = Image.open(BytesIO(original_bytes))
            image.load()
        except UnidentifiedImageError as exc:
            logger.warning(
                "image_job_unreadable",
                extra={"document_id": document_id, "error": str(exc)},
            )
            return {"status": "failed", "reason": "unreadable_image"}

        # Normalize mode for formats that need it when saving JPEG/PNG.
        if image.mode not in ("RGB", "RGBA", "L"):
            image = image.convert("RGBA" if "A" in image.mode else "RGB")

        source_format = (image.format or "PNG").upper()
        save_format = _SAVE_FORMAT.get(source_format, "PNG")
        ext = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}.get(save_format, "png")

        base_dir = str(Path(document.storage_path).parent)
        asset_id = document.asset_id

        # --- Resized derivative (max edge) ---
        resized_rel = f"assets/{asset_id}/derivatives/{document.id}_resized.{ext}"
        resized_image = _fit_within(image, settings.image_max_edge)
        resized_bytes = _encode(resized_image, save_format)
        storage.save(relative_path=resized_rel, data=resized_bytes)

        # --- Thumbnail ---
        thumb_rel = f"assets/{asset_id}/derivatives/{document.id}_thumb.{ext}"
        thumb_image = _fit_within(image, settings.thumbnail_max_edge)
        thumb_bytes = _encode(thumb_image, save_format)
        storage.save(relative_path=thumb_rel, data=thumb_bytes)

        document.resized_path = resized_rel
        document.thumbnail_path = thumb_rel
        session.add(document)
        session.commit()

        logger.info(
            "image_job_completed",
            extra={
                "document_id": document_id,
                "thumbnail_path": thumb_rel,
                "resized_path": resized_rel,
                "thumb_bytes": len(thumb_bytes),
                "resized_bytes": len(resized_bytes),
            },
        )
        return {
            "status": "ok",
            "document_id": document_id,
            "thumbnail_path": thumb_rel,
            "resized_path": resized_rel,
            "base_dir": base_dir,
        }
    except Exception:
        session.rollback()
        logger.exception(
            "image_job_error",
            extra={"document_id": document_id},
        )
        raise
    finally:
        session.close()


def _fit_within(image: Image.Image, max_edge: int) -> Image.Image:
    """Return a copy of *image* scaled so the longest side ≤ max_edge."""
    w, h = image.size
    if w <= max_edge and h <= max_edge:
        return image.copy()
    image = image.copy()
    image.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)
    return image


def _encode(image: Image.Image, save_format: str) -> bytes:
    buffer = BytesIO()
    kwargs: dict = {"format": save_format}
    if save_format == "JPEG":
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")
        kwargs["quality"] = 85
        kwargs["optimize"] = True
    elif save_format == "PNG":
        kwargs["optimize"] = True
    elif save_format == "WEBP":
        kwargs["quality"] = 85
    image.save(buffer, **kwargs)
    return buffer.getvalue()
