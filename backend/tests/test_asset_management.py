"""Phase 5 — asset management: owner, notes, assignees, documents."""

from fastapi.testclient import TestClient


def _project(client: TestClient) -> dict:
    return client.post(
        "/api/v1/projects",
        json={"name": "Ops Site", "slug": "ops-site"},
    ).json()["data"]


def _status(client: TestClient) -> dict:
    return client.post(
        "/api/v1/asset-statuses",
        json={"name": "Available", "slug": "available", "color": "#22c55e"},
    ).json()["data"]


def _type(client: TestClient) -> dict:
    return client.post(
        "/api/v1/asset-types",
        json={"name": "Villa", "slug": "villa"},
    ).json()["data"]


def test_asset_create_update_delete_with_management_fields(client: TestClient) -> None:
    project = _project(client)
    status = _status(client)
    asset_type = _type(client)

    created = client.post(
        "/api/v1/assets",
        json={
            "project_id": project["id"],
            "name": "Villa 12",
            "code": "V-12",
            "asset_type_id": asset_type["id"],
            "asset_status_id": status["id"],
            "owner": "Alex Rivera",
            "notes": "Needs inspection before handover.",
            "assignees": ["Alex Rivera", "Sam Chen", "  Sam Chen  "],
            "metadata": {"map_x": 100, "map_y": 200},
        },
    )
    assert created.status_code == 201, created.text
    asset = created.json()["data"]
    assert asset["owner"] == "Alex Rivera"
    assert asset["notes"] == "Needs inspection before handover."
    assert asset["assignees"] == ["Alex Rivera", "Sam Chen"]
    assert asset["asset_status_id"] == status["id"]

    updated = client.patch(
        f"/api/v1/assets/{asset['id']}",
        json={
            "owner": "Sam Chen",
            "notes": "Inspection complete.",
            "assignees": ["Sam Chen", "Jordan Lee"],
            "asset_status_id": status["id"],
        },
    )
    assert updated.status_code == 200
    body = updated.json()["data"]
    assert body["owner"] == "Sam Chen"
    assert body["notes"] == "Inspection complete."
    assert body["assignees"] == ["Sam Chen", "Jordan Lee"]

    detail = client.get(f"/api/v1/assets/{asset['id']}")
    assert detail.status_code == 200
    assert detail.json()["data"]["name"] == "Villa 12"

    deleted = client.delete(f"/api/v1/assets/{asset['id']}")
    assert deleted.status_code == 204
    assert client.get(f"/api/v1/assets/{asset['id']}").status_code == 404


def test_document_metadata_crud_on_asset(client: TestClient) -> None:
    project = _project(client)
    asset = client.post(
        "/api/v1/assets",
        json={"project_id": project["id"], "name": "Unit 1", "code": "U1"},
    ).json()["data"]

    created = client.post(
        "/api/v1/documents",
        json={
            "asset_id": asset["id"],
            "name": "Floor plan",
            "filename": "floor-plan.pdf",
            "mime_type": "application/pdf",
            "size_bytes": 12000,
            "storage_path": None,
            "notes": "Preliminary",
        },
    )
    assert created.status_code == 201, created.text
    doc = created.json()["data"]
    assert doc["asset_id"] == asset["id"]
    assert doc["filename"] == "floor-plan.pdf"

    listed = client.get(f"/api/v1/assets/{asset['id']}/documents")
    assert listed.status_code == 200
    assert listed.json()["pagination"]["total"] == 1

    patched = client.patch(
        f"/api/v1/documents/{doc['id']}",
        json={"name": "Floor plan v2", "notes": "Final"},
    )
    assert patched.status_code == 200
    assert patched.json()["data"]["name"] == "Floor plan v2"

    deleted = client.delete(f"/api/v1/documents/{doc['id']}")
    assert deleted.status_code == 204
    listed_after = client.get(f"/api/v1/assets/{asset['id']}/documents")
    assert listed_after.json()["pagination"]["total"] == 0


def test_document_requires_existing_asset(client: TestClient) -> None:
    response = client.post(
        "/api/v1/documents",
        json={
            "asset_id": "99999999-9999-4999-8999-999999999999",
            "name": "Doc",
            "filename": "doc.pdf",
        },
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "ASSET_NOT_FOUND"
