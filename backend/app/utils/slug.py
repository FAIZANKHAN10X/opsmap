"""Slug normalization helpers."""

import re

_SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def normalize_slug(value: str) -> str:
    """Normalize and validate a URL-safe slug.

    Raises ValueError so Pydantic field validators surface standard validation errors.
    """
    slug = value.strip().lower().replace("_", "-")
    slug = re.sub(r"\s+", "-", slug)
    slug = re.sub(r"-{2,}", "-", slug).strip("-")
    if not slug or not _SLUG_PATTERN.match(slug):
        raise ValueError(
            "Invalid slug. Use lowercase letters, numbers, and single hyphens."
        )
    if len(slug) > 100:
        raise ValueError("Slug must be at most 100 characters.")
    return slug
