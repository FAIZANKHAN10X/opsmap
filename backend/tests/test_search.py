"""Phase 7 — Search: keyword, filters, sort, pagination, suggestions."""

from fastapi.testclient import TestClient


def _seed(client: TestClient) -> dict:
    project = client.post(
        "/api/v1/projects",
        json={"name": "Search Site", "slug": "search-site"},
    ).json()["data"]
    status_a = client.post(
        "/api/v1/asset-statuses",
        json={"name": "Available", "slug": "available", "color": "#22c55e"},
    ).json()["data"]
    status_s = client.post(
        "/api/v1/asset-statuses",
        json={"name": "Sold", "slug": "sold", "color": "#c026d3"},
    ).json()["data"]
    type_v = client.post(
        "/api/v1/asset-types",
        json={"name": "Villa", "slug": "villa"},
    ).json()["data"]
    type_p = client.post(
        "/api/v1/asset-types",
        json={"name": "Parking", "slug": "parking"},
    ).json()["data"]

    a1 = client.post(
        "/api/v1/assets",
        json={
            "project_id": project["id"],
            "name": "Luxury Villa North",
            "code": "LV-01",
            "owner": "Alex Rivera",
            "assignees": ["Alex Rivera", "Sam Chen"],
            "asset_type_id": type_v["id"],
            "asset_status_id": status_a["id"],
        },
    ).json()["data"]
    a2 = client.post(
        "/api/v1/assets",
        json={
            "project_id": project["id"],
            "name": "Parking Bay 9",
            "code": "P-09",
            "owner": "Jordan Lee",
            "assignees": ["Dock Lead"],
            "asset_type_id": type_p["id"],
            "asset_status_id": status_s["id"],
        },
    ).json()["data"]
    a3 = client.post(
        "/api/v1/assets",
        json={
            "project_id": project["id"],
            "name": "Garden Villa",
            "code": "GV-02",
            "owner": "Alex Rivera",
            "assignees": ["Site Ops"],
            "asset_type_id": type_v["id"],
            "asset_status_id": status_a["id"],
        },
    ).json()["data"]

    return {
        "project": project,
        "a1": a1,
        "a2": a2,
        "a3": a3,
        "status_a": status_a,
        "type_v": type_v,
    }


def test_keyword_search(client: TestClient) -> None:
    seed = _seed(client)
    res = client.get(
        "/api/v1/search",
        params={"q": "luxury", "project_id": seed["project"]["id"]},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["success"] is True
    assert body["pagination"]["total"] == 1
    assert body["data"][0]["code"] == "LV-01"


def test_filters_status_type_owner_employee(client: TestClient) -> None:
    seed = _seed(client)
    pid = seed["project"]["id"]

    by_status = client.get(
        "/api/v1/search",
        params={"project_id": pid, "status": "available"},
    ).json()
    assert by_status["pagination"]["total"] == 2

    by_type = client.get(
        "/api/v1/search",
        params={"project_id": pid, "type": "parking"},
    ).json()
    assert by_type["pagination"]["total"] == 1
    assert by_type["data"][0]["code"] == "P-09"

    by_owner = client.get(
        "/api/v1/search",
        params={"project_id": pid, "owner": "Alex"},
    ).json()
    assert by_owner["pagination"]["total"] == 2

    by_employee = client.get(
        "/api/v1/search",
        params={"project_id": pid, "assigned_to": "Dock Lead"},
    ).json()
    assert by_employee["pagination"]["total"] == 1
    assert by_employee["data"][0]["code"] == "P-09"


def test_sort_and_pagination(client: TestClient) -> None:
    seed = _seed(client)
    pid = seed["project"]["id"]

    asc = client.get(
        "/api/v1/search",
        params={"project_id": pid, "sort": "name", "order": "asc"},
    ).json()
    names = [row["name"] for row in asc["data"]]
    assert names == sorted(names)

    page1 = client.get(
        "/api/v1/search",
        params={
            "project_id": pid,
            "page": 1,
            "limit": 2,
            "sort": "code",
            "order": "asc",
        },
    ).json()
    assert page1["pagination"]["total"] == 3
    assert page1["pagination"]["pages"] == 2
    assert len(page1["data"]) == 2

    page2 = client.get(
        "/api/v1/search",
        params={
            "project_id": pid,
            "page": 2,
            "limit": 2,
            "sort": "code",
            "order": "asc",
        },
    ).json()
    assert len(page2["data"]) == 1


def test_suggestions(client: TestClient) -> None:
    seed = _seed(client)
    res = client.get(
        "/api/v1/search/suggestions",
        params={"q": "villa", "project_id": seed["project"]["id"], "limit": 5},
    )
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert len(data) >= 2
    assert all("label" in row for row in data)


def test_assets_list_supports_search_params(client: TestClient) -> None:
    seed = _seed(client)
    res = client.get(
        "/api/v1/assets",
        params={
            "project_id": seed["project"]["id"],
            "search": "Garden",
            "sort": "name",
            "order": "asc",
        },
    )
    assert res.status_code == 200
    assert res.json()["pagination"]["total"] == 1
    assert res.json()["data"][0]["code"] == "GV-02"
