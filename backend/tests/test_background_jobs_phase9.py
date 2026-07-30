"""Phase 9 — Redis/RQ background jobs: images, email, reports, enqueue paths."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy.orm import Session, sessionmaker

from app.core.queue import reset_queue
from app.core.settings import get_settings
from app.services.jobs import JobService
from app.services.storage import LocalFileStorage
from app.tasks.email import send_email
from app.tasks.images import is_processable_image, process_document_image
from app.tasks.reports import generate_report


@pytest.fixture(autouse=True)
def isolated_upload_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    upload_root = tmp_path / "uploads"
    upload_root.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("UPLOAD_DIR", str(upload_root))
    get_settings.cache_clear()
    yield upload_root
    get_settings.cache_clear()


@pytest.fixture()
def fake_redis():
    import fakeredis

    server = fakeredis.FakeStrictRedis()
    reset_queue()
    with patch("app.core.queue.Redis") as redis_cls:
        redis_cls.from_url.return_value = server
        # Also patch get_redis path used after module import
        with patch("app.core.queue.get_redis", return_value=server):
            with patch("app.core.queue._redis", server):
                with patch("app.core.queue._queue", None):
                    yield server
    reset_queue()


def _png_bytes(width: int = 800, height: int = 600, color=(30, 144, 255)) -> bytes:
    img = Image.new("RGB", (width, height), color)
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _project_and_asset(client: TestClient) -> dict:
    project = client.post(
        "/api/v1/projects",
        json={"name": "Jobs Site", "slug": f"jobs-site-{uuid4().hex[:8]}"},
    ).json()["data"]
    asset = client.post(
        "/api/v1/assets",
        json={"project_id": project["id"], "name": "Asset A", "code": "JA-1"},
    ).json()["data"]
    return {"project": project, "asset": asset}


def test_is_processable_image() -> None:
    assert is_processable_image("image/png") is True
    assert is_processable_image("image/jpeg") is True
    assert is_processable_image("image/svg+xml") is False
    assert is_processable_image("application/pdf") is False
    assert is_processable_image(None) is False


def test_upload_image_enqueues_processing(client: TestClient) -> None:
    seed = _project_and_asset(client)
    with patch("app.services.document.JobService") as job_cls:
        instance = job_cls.return_value
        instance.enqueue_image_processing.return_value = "job-abc"

        upload = client.post(
            "/api/v1/documents/upload",
            data={
                "asset_id": seed["asset"]["id"],
                "name": "Site photo",
                "category": "image",
            },
            files={"file": ("photo.png", _png_bytes(), "image/png")},
        )
        assert upload.status_code == 201, upload.text
        doc = upload.json()["data"]
        assert doc["has_file"] is True
        assert doc["has_thumbnail"] is False
        instance.enqueue_image_processing.assert_called_once()
        called_id = instance.enqueue_image_processing.call_args[0][0]
        assert str(called_id) == doc["id"]


def test_upload_pdf_does_not_enqueue_image_job(client: TestClient) -> None:
    seed = _project_and_asset(client)
    with patch("app.services.document.JobService") as job_cls:
        upload = client.post(
            "/api/v1/documents/upload",
            data={"asset_id": seed["asset"]["id"], "category": "report"},
            files={"file": ("note.pdf", b"%PDF-1.4 x", "application/pdf")},
        )
        assert upload.status_code == 201
        job_cls.return_value.enqueue_image_processing.assert_not_called()


def test_process_document_image_writes_derivatives(
    client: TestClient,
    db_session: Session,
    isolated_upload_dir: Path,
) -> None:
    seed = _project_and_asset(client)
    png = _png_bytes(1200, 900)

    # Upload without enqueue side effects.
    with patch("app.services.document.JobService") as job_cls:
        job_cls.return_value.enqueue_image_processing.return_value = None
        upload = client.post(
            "/api/v1/documents/upload",
            data={"asset_id": seed["asset"]["id"], "category": "image"},
            files={"file": ("big.png", png, "image/png")},
        )
    assert upload.status_code == 201
    doc_id = upload.json()["data"]["id"]

    # Point worker session factory at the same in-memory DB used by the API.
    # TestClient and db_session share the StaticPool SQLite database via override.
    # process_document_image uses get_session_factory() — bind it to test engine.
    bind = db_session.get_bind()
    factory = sessionmaker(
        bind=bind,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
        class_=Session,
    )

    with patch("app.tasks.images.get_session_factory", return_value=factory):
        result = process_document_image(doc_id)

    assert result["status"] == "ok"
    assert result["thumbnail_path"]
    assert result["resized_path"]

    storage = LocalFileStorage()
    assert storage.absolute_path(result["thumbnail_path"]).is_file()
    assert storage.absolute_path(result["resized_path"]).is_file()

    # Reload via API — thumbnail flags and endpoint
    refreshed = client.get(f"/api/v1/documents/{doc_id}").json()["data"]
    assert refreshed["has_thumbnail"] is True
    assert refreshed["thumbnail_path"]

    thumb = client.get(f"/api/v1/documents/{doc_id}/thumbnail")
    assert thumb.status_code == 200
    assert thumb.headers["content-type"].startswith("image/")
    assert len(thumb.content) > 0

    # Thumbnail should be smaller than original
    thumb_img = Image.open(BytesIO(thumb.content))
    assert max(thumb_img.size) <= get_settings().thumbnail_max_edge


def test_send_email_log_only_mode() -> None:
    result = send_email(
        to="ops@example.com",
        subject="Hello",
        body="Body text",
    )
    assert result["status"] == "ok"
    assert result["mode"] == "log_only"


def test_send_email_rejects_invalid_recipient() -> None:
    result = send_email(to="not-an-email", subject="X", body="Y")
    assert result["status"] == "failed"
    assert result["reason"] == "invalid_recipient"


def test_generate_project_summary_report(
    client: TestClient,
    db_session: Session,
    isolated_upload_dir: Path,
) -> None:
    seed = _project_and_asset(client)
    bind = db_session.get_bind()
    factory = sessionmaker(
        bind=bind,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
        class_=Session,
    )
    with patch("app.tasks.reports.get_session_factory", return_value=factory):
        result = generate_report(
            report_type="project_summary",
            project_id=seed["project"]["id"],
            requested_by="test",
        )
    assert result["status"] == "ok"
    assert result["path"]
    assert Path(result["absolute_path"]).is_file()
    assert result["summary"]["asset_count"] == 1


def test_enqueue_report_and_email_with_fakeredis(
    client: TestClient,
    fake_redis,
) -> None:
    seed = _project_and_asset(client)

    # Rebuild queue against fakeredis
    from rq import Queue

    from app.core.queue import DEFAULT_QUEUE_NAME

    queue = Queue(name=DEFAULT_QUEUE_NAME, connection=fake_redis)

    with patch("app.core.queue.get_queue", return_value=queue):
        with patch("app.core.queue.get_redis", return_value=fake_redis):
            with patch("app.services.jobs.ping_redis", return_value=True):
                with patch("app.core.queue.ping_redis", return_value=True):
                    report_resp = client.post(
                        "/api/v1/reports/generate",
                        json={
                            "report_type": "project_summary",
                            "project_id": seed["project"]["id"],
                        },
                    )
                    assert report_resp.status_code == 202, report_resp.text
                    job_id = report_resp.json()["data"]["job_id"]
                    assert job_id

                    email_resp = client.post(
                        "/api/v1/jobs/email",
                        json={
                            "to": "user@example.com",
                            "subject": "Test",
                            "body": "Hello from OpsMap",
                        },
                    )
                    assert email_resp.status_code == 202, email_resp.text

                    # Job status should resolve from fakeredis
                    with patch(
                        "app.services.jobs.fetch_job",
                        wraps=None,
                    ):
                        # fetch via real Job.fetch on fake redis
                        from rq.job import Job

                        def _fetch(jid: str):
                            return Job.fetch(jid, connection=fake_redis)

                        with patch("app.services.jobs.fetch_job", side_effect=_fetch):
                            status = client.get(f"/api/v1/jobs/{job_id}")
                            assert status.status_code == 200
                            body = status.json()["data"]
                            assert body["id"] == job_id
                            assert body["status"] in {
                                "queued",
                                "started",
                                "finished",
                                "failed",
                                "deferred",
                                "scheduled",
                            }


def test_report_generate_requires_project_id(client: TestClient) -> None:
    resp = client.post(
        "/api/v1/reports/generate",
        json={"report_type": "project_summary"},
    )
    assert resp.status_code == 422


def test_job_status_unknown(client: TestClient) -> None:
    with patch("app.services.jobs.JobService.redis_available", return_value=True):
        with patch("app.services.jobs.JobService.get_job_status", return_value=None):
            resp = client.get(f"/api/v1/jobs/{uuid4()}")
            assert resp.status_code == 404


def test_health_includes_redis_field(client: TestClient) -> None:
    resp = client.get("/health")
    assert resp.status_code == 200
    assert "redis" in resp.json()["data"]


def test_job_service_enqueue_returns_none_when_redis_down() -> None:
    with patch("app.services.jobs.enqueue", return_value=None):
        job_id = JobService().enqueue_image_processing(uuid4())
        assert job_id is None
