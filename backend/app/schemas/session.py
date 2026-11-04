"""Hình dạng dữ liệu vào/ra của API phiên. Nhật dùng cái này để code frontend."""
from datetime import datetime

from pydantic import BaseModel

from app.core.enums import FailCode, Result, SessionStatus


class Latency(BaseModel):
    qr_ticket_ms: float | None = None
    db_lookup_ms: float | None = None
    qr_identity_ms: float | None = None
    text_match_ms: float | None = None
    liveness_ms: float | None = None
    face_verify_ms: float | None = None
    total_ms: float | None = None


class SessionState(BaseModel):
    session_id: str
    status: SessionStatus
    created_at: datetime
    expires_at: datetime


class SessionResult(BaseModel):
    session_id: str
    result: Result
    fail_code: FailCode | None = None
    fail_message: str | None = None
    latency: Latency
