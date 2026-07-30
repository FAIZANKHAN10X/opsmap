"""Local file storage for document binaries.

Stores files under upload_dir following:
  assets/{asset_id}/documents/{document_id}_{safe_filename}

Supabase Storage can replace this later without changing document metadata APIs.
"""

from __future__ import annotations

import re
import shutil
from pathlib import Path
from uuid import UUID

from app.core.settings import get_settings


def _safe_filename(name: str) -> str:
    base = Path(name).name
    cleaned = re.sub(r"[^\w.\-()+ ]+", "_", base).strip(" ._")
    return cleaned[:180] or "file"


class LocalFileStorage:
    """Filesystem-backed storage suitable for a single internal deployment."""

    def __init__(self, root: Path | None = None) -> None:
        settings = get_settings()
        self.root = root or Path(settings.upload_dir).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def build_relative_path(
        self,
        *,
        asset_id: UUID,
        document_id: UUID,
        filename: str,
    ) -> str:
        safe = _safe_filename(filename)
        return f"assets/{asset_id}/documents/{document_id}_{safe}"

    def absolute_path(self, relative_path: str) -> Path:
        # Prevent path traversal outside root.
        full = (self.root / relative_path).resolve()
        if not str(full).startswith(str(self.root)):
            raise ValueError("Invalid storage path.")
        return full

    def save(
        self,
        *,
        relative_path: str,
        data: bytes,
    ) -> int:
        path = self.absolute_path(relative_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return len(data)

    def read(self, relative_path: str) -> bytes:
        path = self.absolute_path(relative_path)
        if not path.is_file():
            raise FileNotFoundError(relative_path)
        return path.read_bytes()

    def delete(self, relative_path: str | None) -> None:
        if not relative_path:
            return
        path = self.absolute_path(relative_path)
        if path.is_file():
            path.unlink()
        # Best-effort cleanup of empty dirs.
        parent = path.parent
        try:
            if parent.is_dir() and not any(parent.iterdir()):
                parent.rmdir()
        except OSError:
            pass

    def wipe_root(self) -> None:
        """Test helper: remove all stored files under root."""
        if self.root.exists():
            shutil.rmtree(self.root)
        self.root.mkdir(parents=True, exist_ok=True)
