"""Document categories and allowed upload types (Phase 8)."""

from typing import Final

DOCUMENT_CATEGORIES: Final[frozenset[str]] = frozenset(
    {
        "contract",
        "report",
        "image",
        "manual",
        "other",
    }
)

# MIME types allowed for upload. Previews: images + PDF in browser.
ALLOWED_MIME_TYPES: Final[frozenset[str]] = frozenset(
    {
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/svg+xml",
        "text/plain",
    }
)

PREVIEWABLE_MIME_TYPES: Final[frozenset[str]] = frozenset(
    {
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/svg+xml",
        "text/plain",
    }
)

# Infer category from mime when not provided.
MIME_CATEGORY_HINTS: Final[dict[str, str]] = {
    "application/pdf": "report",
    "image/jpeg": "image",
    "image/png": "image",
    "image/webp": "image",
    "image/gif": "image",
    "image/svg+xml": "image",
    "text/plain": "other",
}
