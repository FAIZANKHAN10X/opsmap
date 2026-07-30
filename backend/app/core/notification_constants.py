"""Notification kinds and severities (Phase 10)."""

from typing import Final

NOTIFICATION_SEVERITIES: Final[frozenset[str]] = frozenset(
    {
        "success",
        "info",
        "warning",
        "error",
    }
)

NOTIFICATION_KINDS: Final[frozenset[str]] = frozenset(
    {
        "assignment",
        "system",
        "email",
    }
)
