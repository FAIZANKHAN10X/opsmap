"""Status color validation helpers."""

import re

_HEX_COLOR = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")


def normalize_hex_color(value: str) -> str:
    """Normalize a CSS hex color to lowercase #rrggbb (or #rgb)."""
    cleaned = value.strip()
    if not _HEX_COLOR.match(cleaned):
        raise ValueError("Color must be a hex value like #22c55e or #fff.")
    return cleaned.lower()
