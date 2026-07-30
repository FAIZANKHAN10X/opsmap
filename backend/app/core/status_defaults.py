"""Default operational statuses for the Status Engine.

Colors are the source of visual truth. UI must not invent alternate colors
for these slugs when a stored color is present.
"""

from typing import TypedDict


class StatusDefault(TypedDict):
    name: str
    slug: str
    color: str
    sort_order: int
    description: str


# Aligned with ROADMAP Phase 6 examples + common ops states.
DEFAULT_ASSET_STATUSES: list[StatusDefault] = [
    {
        "name": "Available",
        "slug": "available",
        "color": "#22c55e",
        "sort_order": 1,
        "description": "Ready for use or sale",
    },
    {
        "name": "Reserved",
        "slug": "reserved",
        "color": "#38bdf8",
        "sort_order": 2,
        "description": "Held for a pending transaction",
    },
    {
        "name": "Occupied",
        "slug": "occupied",
        "color": "#f59e0b",
        "sort_order": 3,
        "description": "Currently in use",
    },
    {
        "name": "Sold",
        "slug": "sold",
        "color": "#c026d3",
        "sort_order": 4,
        "description": "Transaction completed",
    },
    {
        "name": "Maintenance",
        "slug": "maintenance",
        "color": "#ef4444",
        "sort_order": 5,
        "description": "Temporarily offline for work",
    },
    {
        "name": "Pending",
        "slug": "pending",
        "color": "#a78bfa",
        "sort_order": 6,
        "description": "Awaiting decision or action",
    },
    {
        "name": "Offline",
        "slug": "offline",
        "color": "#64748b",
        "sort_order": 7,
        "description": "Not available operationally",
    },
]
