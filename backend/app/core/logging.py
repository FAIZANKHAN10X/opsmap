"""Centralized logging configuration for the OpsMap API.

Import and call ``configure_logging`` once at application startup.
Other modules should use the standard library logger:

    import logging
    logger = logging.getLogger(__name__)
"""

from __future__ import annotations

import json
import logging
import sys
from datetime import UTC, datetime
from typing import Any


class StructuredFormatter(logging.Formatter):
    """Emit one JSON object per log line for production-friendly ingestion."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        # Allow callers to attach structured fields via logger.info("...", extra={...})
        for key, value in record.__dict__.items():
            if key in {
                "name",
                "msg",
                "args",
                "levelname",
                "levelno",
                "pathname",
                "filename",
                "module",
                "exc_info",
                "exc_text",
                "stack_info",
                "lineno",
                "funcName",
                "created",
                "msecs",
                "relativeCreated",
                "thread",
                "threadName",
                "processName",
                "process",
                "message",
                "taskName",
            }:
                continue
            payload[key] = value

        return json.dumps(payload, default=str)


def configure_logging(
    *, level: str | int | None = None, json_logs: bool = True
) -> None:
    """Configure root logging once.

    Parameters
    ----------
    level:
        Log level name or numeric level. Defaults to INFO.
    json_logs:
        When True (default), use structured JSON on stdout.
        When False, use a human-readable format (local debugging).
    """
    root = logging.getLogger()
    if getattr(root, "_opsmap_logging_configured", False):
        return

    resolved_level = logging.INFO
    if level is not None:
        if isinstance(level, int):
            resolved_level = level
        else:
            resolved_level = getattr(logging, str(level).upper(), logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    if json_logs:
        handler.setFormatter(StructuredFormatter())
    else:
        handler.setFormatter(
            logging.Formatter(
                fmt="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
                datefmt="%Y-%m-%dT%H:%M:%S",
            )
        )

    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(resolved_level)

    # Keep third-party loggers quiet unless they are warnings or worse.
    for noisy in ("uvicorn.access", "uvicorn.error", "sqlalchemy.engine"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    root._opsmap_logging_configured = True  # type: ignore[attr-defined]


def get_logger(name: str) -> logging.Logger:
    """Return a module logger. Prefer ``logging.getLogger(__name__)`` equivalently."""
    return logging.getLogger(name)
