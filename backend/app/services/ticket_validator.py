"""Kiểm tra vé: trạng thái đặt chỗ + thời gian làm thủ tục (TC06)."""
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from app.core.enums import FailCode

# Giờ Việt Nam (UTC+7). Dùng múi giờ cố định để không phụ thuộc gói tzdata trên Windows.
VN_TZ = timezone(timedelta(hours=7))

# TODO: hỏi Thành các giá trị booking_status thật trong dataset rồi sửa tập này.
VALID_BOOKING_STATUSES = frozenset({"CONFIRMED"})


@dataclass(frozen=True)
class CheckinWindow:
    """Cửa sổ làm thủ tục: mở trước giờ bay `opens_before`, đóng trước giờ bay `closes_before`.

    Hợp đồng chỉ ghi "theo kịch bản demo", chưa có số cụ thể -> đây là GIÁ TRỊ MẶC ĐỊNH,
    cả nhóm cần chốt lại (cấu hình trong config.py, xem hướng dẫn kèm theo).
    """

    opens_before: timedelta = timedelta(hours=24)
    closes_before: timedelta = timedelta(minutes=45)


def _aware(dt: datetime) -> datetime:
    """Datetime không có múi giờ được coi là giờ Việt Nam."""
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=VN_TZ)


def is_within_checkin_window(
    departure_time: datetime, now: datetime, window: CheckinWindow
) -> bool:
    departure = _aware(departure_time)
    current = _aware(now)
    return departure - window.opens_before <= current <= departure - window.closes_before


def validate_ticket(
    booking_status: str,
    departure_time: datetime,
    now: datetime,
    window: CheckinWindow,
) -> FailCode | None:
    """None nếu vé hợp lệ, ngược lại trả FailCode lý do."""
    if booking_status.strip().upper() not in VALID_BOOKING_STATUSES:
        return FailCode.TICKET_INVALID_STATUS
    if not is_within_checkin_window(departure_time, now, window):
        return FailCode.TICKET_TIME_INVALID
    return None
