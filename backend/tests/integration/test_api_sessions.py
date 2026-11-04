from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_health():
    r = client.get("/api/v1/health")
    assert r.status_code == 200 and r.json() == {"status": "ok"}


def test_create_and_get_session():
    created = client.post("/api/v1/sessions")
    assert created.status_code == 201
    sid = created.json()["session_id"]
    got = client.get(f"/api/v1/sessions/{sid}")
    assert got.status_code == 200 and got.json()["status"] == "CREATED"


def test_session_not_found():
    r = client.get("/api/v1/sessions/khong-co")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "SESSION_NOT_FOUND"


def test_finalize_mock_pass():
    sid = client.post("/api/v1/sessions").json()["session_id"]
    r = client.post(f"/api/v1/sessions/{sid}/finalize")
    assert r.json()["result"] == "PASS"
    assert "total_ms" in r.json()["latency"]


def test_finalize_mock_fail_has_vietnamese_message():
    sid = client.post("/api/v1/sessions").json()["session_id"]
    r = client.post(f"/api/v1/sessions/{sid}/finalize?mock_fail=ID_MISMATCH")
    body = r.json()
    assert body["result"] == "FAIL"
    assert body["fail_code"] == "ID_MISMATCH"
    assert body["fail_message"] == "Số định danh không khớp"


def test_finalize_twice_is_conflict():
    sid = client.post("/api/v1/sessions").json()["session_id"]
    client.post(f"/api/v1/sessions/{sid}/finalize")
    r = client.post(f"/api/v1/sessions/{sid}/finalize")
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "INVALID_STATE"
