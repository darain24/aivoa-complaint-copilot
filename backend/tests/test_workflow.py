"""Use a dedicated PostgreSQL test database; tests never target the default DB."""

import os
import uuid
from pathlib import Path

import pytest
from app.agent import assess_complaint, complaint_graph, demo_extract
from app.database import Record, Session, settings
from app.main import app
from app.models import Complaint
from fastapi.testclient import TestClient
from sqlalchemy import delete

SAMPLE = (Path(__file__).parents[2] / "samples/pharmacy-complaint.txt").read_text()


def test_new_intake_does_not_invent_quantity():
    c = demo_extract(
        "Apollo Pharmacy reported discolored capsules in Amoxicillin Capsules 500 mg. Batch number AMX240602.",
        {},
        "new",
    )
    assert c["quantity"] == ""
    assert c["product"] == "Amoxicillin Capsules"
    assert "quantity" in assess_complaint(c)["missing"]


def test_correction_preserves_fields_and_reruns_graph():
    c = demo_extract(SAMPLE, {}, "new")
    result = complaint_graph.invoke(
        dict(
            text="Sorry the batch number is BMX240602 and affected quantity is 48 capsules",
            current=c,
            operation="correct",
        )
    )
    assert result["complaint"]["batch"] == "BMX240602"
    assert result["complaint"]["quantity"] == "48 capsules"
    assert result["complaint"]["customer"] == c["customer"]
    assert result["assessment"]["severity"] == "Major"
    assert len(result["trace"]) == 3


def test_new_replaces_old_and_question_is_read_only():
    current = demo_extract(SAMPLE, {}, "new")
    new = demo_extract(
        "Product: Metformin API\nDescription: Foreign matter particles", current, "new"
    )
    assert new["customer"] == ""
    assert assess_complaint(new)["severity"] == "Critical"
    result = complaint_graph.invoke(
        dict(text="What CAPA is suggested?", current=current, operation="question")
    )
    assert result["complaint"] == current
    assert "CAPA" in result["message"]


def test_unknown_risk_requires_review():
    assert (
        assess_complaint({"description": "Customer called."})["severity"]
        == "Needs review"
    )


@pytest.fixture
def client():
    if not os.environ.get("TEST_DATABASE_URL"):
        pytest.skip("Set TEST_DATABASE_URL to a dedicated PostgreSQL test database")
    assert settings.database_url == os.environ["TEST_DATABASE_URL"], (
        "DATABASE_URL must equal TEST_DATABASE_URL"
    )
    assert settings.database_url.rsplit("/", 1)[-1].endswith("_test"), (
        "Test DB name must end in _test"
    )
    with TestClient(app) as c:
        with Session() as db:
            db.execute(delete(Record))
            db.commit()
        yield c
        with Session() as db:
            db.execute(delete(Record))
            db.commit()


def test_intake_commit_duplicate_status_and_persistence(client):
    response = client.post("/api/intake", json={"text": SAMPLE})
    assert response.status_code == 200
    result = response.json()
    assert result["assessment"]["completeness"] == 100
    body = {
        "complaint": result["complaint"],
        "reviewed": False,
        "reviewer": "Test QA",
        "request_id": str(uuid.uuid4()),
    }
    assert client.post("/api/complaints", json=body).status_code == 422
    body["reviewed"] = True
    first = client.post("/api/complaints", json=body)
    assert first.status_code == 201
    record = first.json()
    assert client.post("/api/complaints", json=body).json()["id"] == record["id"]
    assert len(client.get("/api/complaints").json()) == 1
    assert (
        client.post("/api/assess", json=body["complaint"]).json()["duplicates"][0]["id"]
        == record["id"]
    )
    with Session() as db:
        assert db.get(Record, record["id"]).complaint["batch"] == "AMX240602"
    path = "/api/complaints/" + record["id"]
    status = {
        "status": "Closed",
        "note": "Investigation complete with sample review.",
        "reviewer": "QA Test",
    }
    assert client.patch(path, json=status).status_code == 409
    status["status"] = "Under investigation"
    assert client.patch(path, json=status).status_code == 200
    status["status"] = "Closed"
    closed = client.patch(path, json=status)
    assert closed.status_code == 200 and len(closed.json()["audit"]) == 3
    assert client.patch(path, json=status).status_code == 409


def test_upload_errors_and_email(client):
    assert (
        client.post("/api/upload", files={"file": ("bad.exe", b"123")}).status_code
        == 415
    )
    assert (
        client.post("/api/upload", files={"file": ("bad.pdf", b"broken")}).status_code
        == 422
    )
    assert (
        client.post("/api/upload", files={"file": ("empty.txt", b" ")}).status_code
        == 422
    )
    assert (
        client.post(
            "/api/upload", files={"file": ("huge.txt", b"x" * (10 * 1024 * 1024 + 1))}
        ).status_code
        == 413
    )
    data = (Path(__file__).parents[2] / "samples/complaint.eml").read_bytes()
    res = client.post("/api/upload", files={"file": ("complaint.eml", data)})
    assert (
        res.status_code == 200
        and res.json()["complaint"]["customer"] == "Apollo Pharmacy"
    )


def test_pdf_upload(client):
    data = (Path(__file__).parents[2] / "samples/api-complaint.pdf").read_bytes()
    res = client.post("/api/upload", files={"file": ("api-complaint.pdf", data)})
    assert res.status_code == 200
    c = res.json()["complaint"]
    assert c["product"] == "Metformin Hydrochloride API"
    assert c["quantity"] == "25 kg (1 HDPE drum)"
    assert c["expiry_date"] == ""
    assert "quarantined pending laboratory investigation" in c["description"]
    assert res.json()["assessment"]["severity"] == "Critical"


def test_blank_commit_and_invalid_live_key(client, monkeypatch):
    assert client.post("/api/intake", json={"text": "   "}).status_code == 422
    body = {
        "complaint": Complaint().model_dump(),
        "reviewed": True,
        "reviewer": "QA",
        "request_id": str(uuid.uuid4()),
    }
    assert client.post("/api/complaints", json=body).status_code == 422
    monkeypatch.setattr(settings, "ai_mode", "live")
    monkeypatch.setattr(settings, "groq_api_key", "")
    assert client.post("/api/intake", json={"text": SAMPLE}).status_code == 503
