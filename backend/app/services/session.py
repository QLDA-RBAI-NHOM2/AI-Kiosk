"""Quản lý phiên xác thực. HIỆN TẠI lưu trong RAM (dict) để chạy được ngay.
Sau này thay bằng db/repositories/session_repo.py (lưu PostgreSQL), giữ nguyên tên hàm."""
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from app.core.config import get_settings
from app.core.enums import FAIL_MESSAGES, ErrorCode, FailCode, Result, SessionStatus
from app.core.errors import AppError
from app.schemas.session import Latency, SessionResult


@dataclass
class SessionRecord:
    session_id: str
    status: SessionStatus
    created_at: datetime
    expires_at: datetime


_STORE: dict[str, SessionRecord] = {}


def _now() -> datetime:
    return datetime.now(UTC)


def create_session() -> SessionRecord:
    now = _now()
    rec = SessionRecord(
        session_id=uuid4().hex,
        status=SessionStatus.CREATED,
        created_at=now,
        expires_at=now + timedelta(seconds=get_settings().session_ttl_seconds),
    )
    _STORE[rec.session_id] = rec
    return rec


def get_session(session_id: str) -> SessionRecord:
    rec = _STORE.get(session_id)
    if rec is None:
        raise AppError(ErrorCode.SESSION_NOT_FOUND, "Không tìm thấy phiên", 404)
    if _now() > rec.expires_at:
        raise AppError(ErrorCode.SESSION_EXPIRED, "Phiên đã hết hạn, hãy bắt đầu lại", 410)
    return rec


def finalize_mock(session_id: str, mock_fail: FailCode | None) -> SessionResult:
    """MOCK: trả kết quả giả để Nhật test giao diện. Sẽ thay bằng Rule Engine thật."""
    rec = get_session(session_id)
    if rec.status == SessionStatus.DONE:
        raise AppError(ErrorCode.INVALID_STATE, "Phiên đã có kết quả", 409)
    rec.status = SessionStatus.DONE

    fake_latency = Latency(  # số giả, chỉ để hiển thị thử Latency Panel
        qr_ticket_ms=120, db_lookup_ms=15, qr_identity_ms=110,
        text_match_ms=3, liveness_ms=900, face_verify_ms=700, total_ms=1850,
    )
    if mock_fail is None:
        return SessionResult(session_id=session_id, result=Result.PASS, latency=fake_latency)
    return SessionResult(
        session_id=session_id,
        result=Result.FAIL,
        fail_code=mock_fail,
        fail_message=FAIL_MESSAGES[mock_fail],
        latency=fake_latency,
    )
