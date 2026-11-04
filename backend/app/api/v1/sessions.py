from fastapi import APIRouter

from app.core.enums import FailCode
from app.schemas.session import SessionResult, SessionState
from app.services import session as session_service

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _to_state(rec: session_service.SessionRecord) -> SessionState:
    return SessionState(
        session_id=rec.session_id,
        status=rec.status,
        created_at=rec.created_at,
        expires_at=rec.expires_at,
    )


@router.post("", response_model=SessionState, status_code=201)
def create_session():
    """Bước 0: kiosk bắt đầu một lượt xác thực mới."""
    return _to_state(session_service.create_session())


@router.get("/{session_id}", response_model=SessionState)
def get_session(session_id: str):
    """Frontend hỏi trạng thái hiện tại của phiên."""
    return _to_state(session_service.get_session(session_id))


@router.post("/{session_id}/finalize", response_model=SessionResult)
def finalize_session(session_id: str, mock_fail: FailCode | None = None):
    """MOCK. Mặc định trả PASS; thêm ?mock_fail=ID_MISMATCH để thử màn hình FAIL."""
    return session_service.finalize_mock(session_id, mock_fail)
