"""Phase 6 — Status Engine tests."""

from fastapi.testclient import TestClient


def test_create_status_requires_valid_hex_color(client: TestClient) -> None:
    bad = client.post(
        "/api/v1/asset-statuses",
        json={"name": "Broken", "slug": "broken", "color": "red"},
    )
    assert bad.status_code == 422

    good = client.post(
        "/api/v1/asset-statuses",
        json={
            "name": "Available",
            "slug": "available",
            "color": "#22C55E",
            "sort_order": 1,
        },
    )
    assert good.status_code == 201, good.text
    assert good.json()["data"]["color"] == "#22c55e"


def test_seed_defaults_is_idempotent(client: TestClient) -> None:
    first = client.post("/api/v1/asset-statuses/seed-defaults")
    assert first.status_code == 200, first.text
    total_after_first = first.json()["pagination"]["total"]
    assert total_after_first >= 6

    second = client.post("/api/v1/asset-statuses/seed-defaults")
    assert second.status_code == 200
    assert second.json()["pagination"]["total"] == total_after_first
    assert (
        "already present" in (second.json()["message"] or "").lower()
        or second.json()["message"]
    )

    slugs = {row["slug"] for row in second.json()["data"]}
    for expected in (
        "available",
        "reserved",
        "sold",
        "maintenance",
        "pending",
        "offline",
    ):
        assert expected in slugs

    # Every seeded status carries a color — UI appearance is data-driven.
    for row in second.json()["data"]:
        assert row["color"]
        assert row["color"].startswith("#")


def test_update_status_color_propagates_in_read(client: TestClient) -> None:
    created = client.post(
        "/api/v1/asset-statuses",
        json={"name": "Pending", "slug": "pending-custom", "color": "#a78bfa"},
    ).json()["data"]

    patched = client.patch(
        f"/api/v1/asset-statuses/{created['id']}",
        json={"color": "#7c3aed"},
    )
    assert patched.status_code == 200
    assert patched.json()["data"]["color"] == "#7c3aed"

    got = client.get(f"/api/v1/asset-statuses/{created['id']}")
    assert got.json()["data"]["color"] == "#7c3aed"


def test_cannot_delete_status_in_use(client: TestClient) -> None:
    status = client.post(
        "/api/v1/asset-statuses",
        json={"name": "Sold", "slug": "sold-tmp", "color": "#c026d3"},
    ).json()["data"]
    project = client.post(
        "/api/v1/projects",
        json={"name": "Site", "slug": "site-status"},
    ).json()["data"]
    client.post(
        "/api/v1/assets",
        json={
            "project_id": project["id"],
            "name": "Unit 1",
            "asset_status_id": status["id"],
        },
    )

    blocked = client.delete(f"/api/v1/asset-statuses/{status['id']}")
    assert blocked.status_code == 422
    assert blocked.json()["error"]["code"] == "VALIDATION_ERROR"

    # Free the asset, then delete succeeds.
    assets = client.get(f"/api/v1/assets?project_id={project['id']}").json()["data"]
    client.patch(
        f"/api/v1/assets/{assets[0]['id']}",
        json={"asset_status_id": None},
    )
    deleted = client.delete(f"/api/v1/asset-statuses/{status['id']}")
    assert deleted.status_code == 204
    assert client.get(f"/api/v1/asset-statuses/{status['id']}").status_code == 404


def test_asset_status_change_reflected_on_asset_read(client: TestClient) -> None:
    """Automatic visual updates: asset carries status_id; UI maps color from status data."""
    a = client.post(
        "/api/v1/asset-statuses",
        json={"name": "Available", "slug": "avail-v", "color": "#22c55e"},
    ).json()["data"]
    b = client.post(
        "/api/v1/asset-statuses",
        json={"name": "Sold", "slug": "sold-v", "color": "#c026d3"},
    ).json()["data"]
    project = client.post(
        "/api/v1/projects",
        json={"name": "P", "slug": "p-status-vis"},
    ).json()["data"]
    asset = client.post(
        "/api/v1/assets",
        json={
            "project_id": project["id"],
            "name": "Villa",
            "asset_status_id": a["id"],
        },
    ).json()["data"]
    assert asset["asset_status_id"] == a["id"]

    updated = client.patch(
        f"/api/v1/assets/{asset['id']}",
        json={"asset_status_id": b["id"]},
    ).json()["data"]
    assert updated["asset_status_id"] == b["id"]

    statuses = {
        row["id"]: row for row in client.get("/api/v1/asset-statuses").json()["data"]
    }
    assert statuses[b["id"]]["color"] == "#c026d3"
