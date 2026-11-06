"""Rule Engine: nhận kết quả các bước và quyết định PASS/FAIL (bước 7 của luồng 8 bước).

Hàm thuần Python: không đụng DB, không đụng AI, không đọc cấu hình.
Mọi thứ (vé, ngưỡng, giờ hiện tại, pepper...) được truyền vào, nên test rất dễ.

Thứ tự ưu tiên khi có nhiều lỗi (dừng ở lỗi đầu tiên):
    vé -> thời gian/trạng thái vé -> số định danh -> họ tên -> liveness -> khuôn mặt
"""
from dataclasses import dataclass
from datetime import datetime

from app.core.enums import FAIL_MESSAGES, FailCode, Result
from app.core.security import hash_id_number, hashes_equal
from app.services.id_normalizer import normalize_id
from app.services.name_normalizer import names_match
from app.services.ticket_validator import CheckinWindow, validate_ticket


@dataclass(frozen=True)
class TicketInfo:
    """Thông tin vé lấy từ DB (bước 2)."""

    ticket_id: str
    passenger_name: str
    id_number_hash: str
    booking_status: str
    departure_time: datetime


@dataclass(frozen=True)
class IdentityInfo:
    """Thông tin đọc từ QR định danh (bước 3). id_number là số THÔ, chưa chuẩn hóa."""

    id_number: str | None
    name: str | None


@dataclass(frozen=True)
class Decision:
    result: Result
    fail_code: FailCode | None = None

    @property
    def fail_message(self) -> str | None:
        return FAIL_MESSAGES[self.fail_code] if self.fail_code else None


def check_ticket(
    ticket: TicketInfo | None, now: datetime, window: CheckinWindow
) -> FailCode | None:
    if ticket is None:
        return FailCode.TICKET_NOT_FOUND
    return validate_ticket(ticket.booking_status, ticket.departure_time, now, window)


def check_text_match(
    ticket: TicketInfo, identity: IdentityInfo | None, pepper: str
) -> FailCode | None:
    """Bước 4. Số định danh khớp chính xác là điều kiện bắt buộc; sau đó mới so họ tên."""
    if identity is None:
        return FailCode.ID_MISMATCH
    normalized = normalize_id(identity.id_number)
    if normalized is None:
        return FailCode.ID_MISMATCH
    if not hashes_equal(hash_id_number(normalized, pepper), ticket.id_number_hash):
        return FailCode.ID_MISMATCH
    if not names_match(identity.name, ticket.passenger_name):
        return FailCode.NAME_MISMATCH
    return None


def check_liveness(liveness_passed: bool | None) -> FailCode | None:
    """None (chưa có kết quả) cũng bị coi là chưa đạt."""
    return None if liveness_passed else FailCode.LIVENESS_FAIL


def check_face(face_score: float | None, threshold: float) -> FailCode | None:
    """Điểm cosine phải >= ngưỡng (ngưỡng do module AI chọn bằng thực nghiệm)."""
    if face_score is None or face_score < threshold:
        return FailCode.FACE_MISMATCH
    return None


def decide(
    *,
    ticket: TicketInfo | None,
    identity: IdentityInfo | None,
    liveness_passed: bool | None,
    face_score: float | None,
    now: datetime,
    pepper: str,
    face_threshold: float,
    window: CheckinWindow,
) -> Decision:
    """Tổng hợp cuối cùng. PASS chỉ khi mọi điều kiện đều đạt."""
    if ticket is None:
        return Decision(Result.FAIL, FailCode.TICKET_NOT_FOUND)
    code = (
        check_ticket(ticket, now, window)
        or check_text_match(ticket, identity, pepper)
        or check_liveness(liveness_passed)
        or check_face(face_score, face_threshold)
    )
    if code is not None:
        return Decision(Result.FAIL, code)
    return Decision(Result.PASS)
