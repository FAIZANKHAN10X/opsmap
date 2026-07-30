"""Phase 8 — document upload, download, preview, delete, categories."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.settings import get_settings


@pytest.fixture(autouse=True)
def isolated_upload_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """Point upload storage at a temp directory for every test in this module."""
    upload_root = tmp_path / "uploads"
    upload_root.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("UPLOAD_DIR", str(upload_root))
    get_settings.cache_clear()
    yield upload_root
    get_settings.cache_clear()


def _project_and_asset(client: TestClient) -> dict:
    project = client.post(
        "/api/v1/projects",
        json={"name": "Docs Site", "slug": "docs-site"},
    ).json()["data"]
    asset = client.post(
        "/api/v1/assets",
        json={"project_id": project["id"], "name": "Villa Docs", "code": "VD-1"},
    ).json()["data"]
    return {"project": project, "asset": asset}


def test_upload_download_preview_delete(client: TestClient) -> None:
    seed = _project_and_asset(client)
    pdf_bytes = b"%PDF-1.4 mock document content"

    upload = client.post(
        "/api/v1/documents/upload",
        data={
            "asset_id": seed["asset"]["id"],
            "name": "Purchase agreement",
            "category": "contract",
            "notes": "Signed",
        },
        files={"file": ("agreement.pdf", pdf_bytes, "application/pdf")},
    )
    assert upload.status_code == 201, upload.text
    doc = upload.json()["data"]
    assert doc["category"] == "contract"
    assert doc["has_file"] is True
    assert doc["is_previewable"] is True
    assert doc["size_bytes"] == len(pdf_bytes)
    assert doc["storage_path"]

    listed = client.get(f"/api/v1/assets/{seed['asset']['id']}/documents")
    assert listed.json()["pagination"]["total"] == 1

    download = client.get(f"/api/v1/documents/{doc['id']}/download")
    assert download.status_code == 200
    assert download.content == pdf_bytes
    assert "attachment" in download.headers.get("content-disposition", "")

    preview = client.get(f"/api/v1/documents/{doc['id']}/preview")
    assert preview.status_code == 200
    assert preview.content == pdf_bytes
    assert "inline" in preview.headers.get("content-disposition", "")

    deleted = client.delete(f"/api/v1/documents/{doc['id']}")
    assert deleted.status_code == 204
    assert client.get(f"/api/v1/documents/{doc['id']}").status_code == 404


def test_rejects_disallowed_mime_and_empty_file(client: TestClient) -> None:
    seed = _project_and_asset(client)

    bad = client.post(
        "/api/v1/documents/upload",
        data={"asset_id": seed["asset"]["id"]},
        files={"file": ("virus.exe", b"MZ....", "application/x-msdownload")},
    )
    assert bad.status_code == 422

    empty = client.post(
        "/api/v1/documents/upload",
        data={"asset_id": seed["asset"]["id"]},
        files={"file": ("empty.pdf", b"", "application/pdf")},
    )
    assert empty.status_code == 422


def test_list_documents_by_category(client: TestClient) -> None:
    seed = _project_and_asset(client)

    client.post(
        "/api/v1/documents/upload",
        data={
            "asset_id": seed["asset"]["id"],
            "category": "image",
            "name": "Photo",
        },
        files={"file": ("a.png", b"\x89PNG\r\n\x1a\n" + b"0" * 20, "image/png")},
    )
    client.post(
        "/api/v1/documents/upload",
        data={
            "asset_id": seed["asset"]["id"],
            "category": "report",
            "name": "Weekly",
        },
        files={"file": ("r.pdf", b"%PDF-1.4 report", "application/pdf")},
    )

    images = client.get(
        "/api/v1/documents",
        params={"asset_id": seed["asset"]["id"], "category": "image"},
    ).json()
    assert images["pagination"]["total"] == 1
    assert images["data"][0]["category"] == "image"

    all_docs = client.get(
        "/api/v1/documents",
        params={"asset_id": seed["asset"]["id"]},
    ).json()
    assert all_docs["pagination"]["total"] == 2
