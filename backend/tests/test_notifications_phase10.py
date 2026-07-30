"""Phase 10 — notifications: toasts data API, assignment alerts, email jobs."""

from __future__ import annotations

from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient


def _project(client: TestClient) -> dict:
    return client.post(
        "/api/v1/projects",
        json={"name": "Alert Site", "slug": f"alert-{uuid4().hex[:8]}"},
    ).json()["data"]


def test_create_list_mark_read_notifications(client: TestClient) -> None:
    created = client.post(
        "/api/v1/notifications",
        json={
            "severity": "success",
            "kind": "system",
            "title": "Saved",
            "message": "Project updated successfully.",
            "recipient": "ops@example.com",
        },
    )
    assert created.status_code == 201, created.text
    note = created.json()["data"]
    assert note["severity"] == "success"
    assert note["is_read"] is False
    assert note["kind"] == "system"

    listed = client.get("/api/v1/notifications")
    assert listed.status_code == 200
    assert listed.json()["pagination"]["total"] >= 1

    unread = client.get("/api/v1/notifications/unread-count")
    assert unread.status_code == 200
    assert unread.json()["data"]["count"] >= 1

    marked = client.patch(
        f"/api/v1/notifications/{note['id']}",
        json={"read": True},
    )
    assert marked.status_code == 200
    assert marked.json()["data"]["is_read"] is True
    assert marked.json()["data"]["read_at"] is not None


def test_mark_all_read(client: TestClient) -> None:
    for i in range(2):
        client.post(
            "/api/v1/notifications",
            json={
                "kind": "system",
                "title": f"N{i}",
                "message": f"Message {i}",
                "recipient": "team",
            },
        )
    res = client.post("/api/v1/notifications/read-all?recipient=team")
    assert res.status_code == 200
    assert res.json()["data"]["count"] >= 2
    unread = client.get("/api/v1/notifications/unread-count?recipient=team")
    assert unread.json()["data"]["count"] == 0


def test_assignment_on_create_generates_alerts(client: TestClient) -> None:
    project = _project(client)
    with patch("app.services.notification.JobService") as job_cls:
        job_cls.return_value.enqueue_email.return_value = "email-job-1"
        asset_res = client.post(
            "/api/v1/assets",
            json={
                "project_id": project["id"],
                "name": "Villa North",
                "code": "VN-1",
                "assignees": ["Alex Rivera", "alex@opsmap.local"],
            },
        )
    assert asset_res.status_code == 201, asset_res.text

    notes = client.get("/api/v1/notifications?kind=assignment")
    assert notes.status_code == 200
    data = notes.json()["data"]
    assert len(data) == 2
    recipients = {n["recipient"] for n in data}
    assert "Alex Rivera" in recipients
    assert "alex@opsmap.local" in recipients
    email_note = next(n for n in data if n["recipient"] == "alex@opsmap.local")
    assert email_note["recipient_email"] == "alex@opsmap.local"
    assert email_note["entity_type"] == "asset"
    assert "email_job_id" in (email_note.get("metadata") or {})


def test_assignment_on_update_only_alerts_new_assignees(client: TestClient) -> None:
    project = _project(client)
    with patch("app.services.notification.JobService") as job_cls:
        job_cls.return_value.enqueue_email.return_value = None
        asset = client.post(
            "/api/v1/assets",
            json={
                "project_id": project["id"],
                "name": "Dock A",
                "assignees": ["Sam"],
            },
        ).json()["data"]

        before = client.get("/api/v1/notifications?kind=assignment").json()[
            "pagination"
        ]["total"]

        client.patch(
            f"/api/v1/assets/{asset['id']}",
            json={"assignees": ["Sam", "Jordan"]},
        )

    after = client.get("/api/v1/notifications?kind=assignment")
    assert after.json()["pagination"]["total"] == before + 1
    newest = after.json()["data"][0]
    # Ordered by created_at desc — Jordan should be among recent
    recipients = {n["recipient"] for n in after.json()["data"]}
    assert "Jordan" in recipients
    assert newest["kind"] == "assignment"


def test_update_without_assignee_change_no_extra_alerts(client: TestClient) -> None:
    project = _project(client)
    with patch("app.services.notification.JobService") as job_cls:
        job_cls.return_value.enqueue_email.return_value = None
        asset = client.post(
            "/api/v1/assets",
            json={
                "project_id": project["id"],
                "name": "Stable",
                "assignees": ["Lee"],
            },
        ).json()["data"]
        count_before = client.get("/api/v1/notifications?kind=assignment").json()[
            "pagination"
        ]["total"]
        client.patch(
            f"/api/v1/assets/{asset['id']}",
            json={"name": "Stable Renamed"},
        )
        count_after = client.get("/api/v1/notifications?kind=assignment").json()[
            "pagination"
        ]["total"]
    assert count_after == count_before


def test_rejects_invalid_severity(client: TestClient) -> None:
    res = client.post(
        "/api/v1/notifications",
        json={
            "severity": "critical",
            "kind": "system",
            "title": "X",
            "message": "Y",
        },
    )
    assert res.status_code == 422
