from datetime import UTC, datetime, timedelta

from app.core.enums import FailCode
from app.services.ticket_validator import (
    VN_TZ,
    CheckinWindow,
    is_within_checkin_window,
    validate_ticket,
)

WINDOW = CheckinWindow(timedelta(hours=24), timedelta(minutes=45))
DEPARTURE = datetime(2026, 12, 1, 10, 0, tzinfo=VN_TZ)
SECOND = timedelta(seconds=1)


def test_inside_window_is_valid():
    assert is_within_checkin_window(DEPARTURE, DEPARTURE - timedelta(hours=3), WINDOW)


def test_window_opening_boundary():
    opens = DEPARTURE - timedelta(hours=24)
    assert is_within_checkin_window(DEPARTURE, opens, WINDOW)
    assert not is_within_checkin_window(DEPARTURE, opens - SECOND, WINDOW)


def test_window_closing_boundary():
    closes = DEPARTURE - timedelta(minutes=45)
    assert is_within_checkin_window(DEPARTURE, closes, WINDOW)
    assert not is_within_checkin_window(DEPARTURE, closes + SECOND, WINDOW)


def test_already_departed_is_invalid():
    assert not is_within_checkin_window(DEPARTURE, DEPARTURE + timedelta(hours=1), WINDOW)


def test_naive_datetime_is_treated_as_vietnam_time():
    naive_departure = datetime(2026, 12, 1, 10, 0)
    naive_now = datetime(2026, 12, 1, 8, 0)
    assert is_within_checkin_window(naive_departure, naive_now, WINDOW)


def test_utc_now_is_converted_to_vietnam_time():
    # 01:00 UTC = 08:00 giờ VN -> còn 2 giờ trước giờ bay, trong cửa sổ
    assert is_within_checkin_window(DEPARTURE, datetime(2026, 12, 1, 1, 0, tzinfo=UTC), WINDOW)


def test_validate_ticket_ok():
    now = DEPARTURE - timedelta(hours=2)
    assert validate_ticket("CONFIRMED", DEPARTURE, now, WINDOW) is None
    assert validate_ticket(" confirmed ", DEPARTURE, now, WINDOW) is None


def test_validate_ticket_bad_status():
    now = DEPARTURE - timedelta(hours=2)
    assert validate_ticket("CANCELLED", DEPARTURE, now, WINDOW) == FailCode.TICKET_INVALID_STATUS


def test_validate_ticket_bad_time():
    now = DEPARTURE + timedelta(hours=2)
    assert validate_ticket("CONFIRMED", DEPARTURE, now, WINDOW) == FailCode.TICKET_TIME_INVALID
