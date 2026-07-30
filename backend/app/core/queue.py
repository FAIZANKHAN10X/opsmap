"""Redis + RQ queue connection and enqueue helpers.

API request handlers must not perform long-running work. They enqueue jobs
here and return immediately. Workers under ``app.workers`` consume the queue.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any

from redis import Redis
from redis.exceptions import RedisError
from rq import Queue
from rq.job import Job

from app.core.settings import get_settings

logger = logging.getLogger(__name__)

# Default queue name for OpsMap background work.
DEFAULT_QUEUE_NAME = "opsmap"

_redis: Redis | None = None
_queue: Queue | None = None


def get_redis() -> Redis:
    """Return a shared Redis connection for RQ."""
    global _redis
    if _redis is None:
        settings = get_settings()
        _redis = Redis.from_url(settings.redis_url)
    return _redis


def get_queue(*, name: str | None = None) -> Queue:
    """Return the default (or named) RQ queue."""
    global _queue
    queue_name = name or DEFAULT_QUEUE_NAME
    if name is not None and name != DEFAULT_QUEUE_NAME:
        return Queue(name=queue_name, connection=get_redis())
    if _queue is None:
        _queue = Queue(name=queue_name, connection=get_redis())
    return _queue


def reset_queue() -> None:
    """Drop cached Redis/queue handles (tests)."""
    global _redis, _queue
    if _redis is not None:
        try:
            _redis.close()
        except Exception:  # noqa: BLE001 — best-effort cleanup
            pass
    _redis = None
    _queue = None


def ping_redis() -> bool:
    """Return True when Redis responds to PING."""
    try:
        return bool(get_redis().ping())
    except RedisError:
        return False


def enqueue(
    func: Callable[..., Any],
    *args: Any,
    job_timeout: str | int | None = None,
    result_ttl: int | None = None,
    failure_ttl: int | None = None,
    description: str | None = None,
    **kwargs: Any,
) -> Job | None:
    """Enqueue a callable on the default queue.

    Returns the RQ Job on success, or None if Redis is unavailable.
    Failures to enqueue are logged and never raised so HTTP handlers stay
    non-blocking (document upload must not fail because workers are down).
    """
    settings = get_settings()
    timeout = job_timeout if job_timeout is not None else settings.rq_job_timeout
    r_ttl = result_ttl if result_ttl is not None else settings.rq_result_ttl
    f_ttl = failure_ttl if failure_ttl is not None else settings.rq_failure_ttl

    try:
        queue = get_queue()
        job = queue.enqueue(
            func,
            *args,
            **kwargs,
            job_timeout=timeout,
            result_ttl=r_ttl,
            failure_ttl=f_ttl,
            description=description,
        )
        logger.info(
            "job_enqueued",
            extra={
                "job_id": job.id,
                "func": f"{func.__module__}.{func.__name__}",
                "description": description,
            },
        )
        return job
    except RedisError as exc:
        logger.warning(
            "job_enqueue_failed",
            extra={
                "func": f"{func.__module__}.{func.__name__}",
                "error": str(exc),
            },
        )
        return None


def fetch_job(job_id: str) -> Job | None:
    """Load an RQ job by id, or None if missing / Redis unavailable."""
    try:
        return Job.fetch(job_id, connection=get_redis())
    except Exception:  # noqa: BLE001 — JobNotFound, Redis errors, etc.
        return None
