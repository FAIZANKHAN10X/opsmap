"""RQ worker process entrypoint.

Usage (from backend/):

    uv run python -m app.workers.worker

Or with the rq CLI (queues must match DEFAULT_QUEUE_NAME):

    uv run rq worker opsmap --url "$REDIS_URL"
"""

from __future__ import annotations

import sys

from redis.exceptions import RedisError
from rq import Worker

from app.core.logging import configure_logging, get_logger
from app.core.queue import DEFAULT_QUEUE_NAME, get_queue, get_redis
from app.core.settings import get_settings

logger = get_logger(__name__)


def main(argv: list[str] | None = None) -> int:
    """Start an RQ worker consuming the OpsMap default queue."""
    _ = argv  # reserved for future CLI flags
    settings = get_settings()
    configure_logging(
        level="DEBUG" if settings.app_debug else "INFO",
        json_logs=not settings.is_development,
    )

    try:
        redis = get_redis()
        redis.ping()
    except RedisError as exc:
        logger.error("worker_redis_unavailable", extra={"error": str(exc)})
        print(f"Redis unavailable at {settings.redis_url}: {exc}", file=sys.stderr)
        return 1

    queue = get_queue()
    logger.info(
        "worker_starting",
        extra={
            "queue": DEFAULT_QUEUE_NAME,
            "redis_url": settings.redis_url,
            "environment": settings.app_env,
        },
    )

    # with_scheduler=False keeps Phase 9 simple; cron jobs are not required yet.
    worker = Worker(
        [queue],
        connection=redis,
        name=f"opsmap-worker-{settings.app_env}",
    )
    worker.work(with_scheduler=False)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
