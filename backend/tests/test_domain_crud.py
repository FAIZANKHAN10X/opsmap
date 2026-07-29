"""CRUD and relationship tests for the core domain API."""

from fastapi.testclient import TestClient


def _create_project(client: TestClient, slug: str = "north-site") -> dict:
    response = client.post(
        "/api/v1/projects",
        json={
            "name": "North Site",
            "slug": slug,
            "description": "Primary site",
        },
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["success"] is True
    return body["data"]


def test_health_still_works(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["data"]["status"] == "ok"


def test_project_crud_and_slug_conflict(client: TestClient) -> None:
    project = _create_project(client)
    project_id = project["id"]

    listed = client.get("/api/v1/projects")
    assert listed.status_code == 200
    assert listed.json()["pagination"]["total"] == 1
    assert "organization_id" not in listed.json()["data"][0]

    got = client.get(f"/api/v1/projects/{project_id}")
    assert got.status_code == 200
    assert got.json()["data"]["slug"] == "north-site"

    updated = client.patch(
        f"/api/v1/projects/{project_id}",
        json={"name": "North Site Renamed"},
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["name"] == "North Site Renamed"

    conflict = client.post(
        "/api/v1/projects",
        json={"name": "Other", "slug": "north-site"},
    )
    assert conflict.status_code == 409
    assert conflict.json()["error"]["code"] == "PROJECT_SLUG_EXISTS"


def test_project_asset_type_status_relationships(client: TestClient) -> None:
    project = _create_project(client)
    project_id = project["id"]

    type_resp = client.post(
        "/api/v1/asset-types",
        json={
            "name": "Villa",
            "slug": "villa",
            "sort_order": 1,
        },
    )
    assert type_resp.status_code == 201, type_resp.text
    assert "organization_id" not in type_resp.json()["data"]
    asset_type_id = type_resp.json()["data"]["id"]

    status_resp = client.post(
        "/api/v1/asset-statuses",
        json={
            "name": "Available",
            "slug": "available",
            "color": "#22c55e",
            "sort_order": 1,
        },
    )
    assert status_resp.status_code == 201, status_resp.text
    asset_status_id = status_resp.json()["data"]["id"]

    asset_resp = client.post(
        "/api/v1/assets",
        json={
            "project_id": project_id,
            "name": "Villa A1",
            "code": "A1",
            "asset_type_id": asset_type_id,
            "asset_status_id": asset_status_id,
            "metadata": {"bedrooms": 4},
        },
    )
    assert asset_resp.status_code == 201, asset_resp.text
    asset = asset_resp.json()["data"]
    assert asset["metadata"]["bedrooms"] == 4
    assert asset["asset_type_id"] == asset_type_id
    assert asset["asset_status_id"] == asset_status_id

    listed = client.get(f"/api/v1/assets?project_id={project_id}")
    assert listed.status_code == 200
    assert listed.json()["pagination"]["total"] == 1

    types_list = client.get("/api/v1/asset-types")
    assert types_list.status_code == 200
    assert types_list.json()["pagination"]["total"] == 1

    statuses_list = client.get("/api/v1/asset-statuses")
    assert statuses_list.status_code == 200
    assert statuses_list.json()["pagination"]["total"] == 1

    patched = client.patch(
        f"/api/v1/assets/{asset['id']}",
        json={"name": "Villa A1 Renamed", "metadata": {"bedrooms": 5}},
    )
    assert patched.status_code == 200
    assert patched.json()["data"]["name"] == "Villa A1 Renamed"
    assert patched.json()["data"]["metadata"]["bedrooms"] == 5

    deleted = client.delete(f"/api/v1/assets/{asset['id']}")
    assert deleted.status_code == 204

    missing = client.get(f"/api/v1/assets/{asset['id']}")
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "ASSET_NOT_FOUND"

    project_deleted = client.delete(f"/api/v1/projects/{project_id}")
    assert project_deleted.status_code == 204
    assert client.get(f"/api/v1/projects/{project_id}").status_code == 404


def test_validation_errors(client: TestClient) -> None:
    response = client.post(
        "/api/v1/projects",
        json={"name": "", "slug": "Bad Slug!!"},
    )
    assert response.status_code == 422
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "VALIDATION_ERROR"


def test_organizations_endpoint_removed(client: TestClient) -> None:
    response = client.get("/api/v1/organizations")
    assert response.status_code == 404


def test_missing_type_returns_not_found(client: TestClient) -> None:
    project = _create_project(client, slug="site-a")
    missing_type = "99999999-9999-4999-8999-999999999999"
    response = client.post(
        "/api/v1/assets",
        json={
            "project_id": project["id"],
            "name": "M1",
            "asset_type_id": missing_type,
        },
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "ASSET_TYPE_NOT_FOUND"
