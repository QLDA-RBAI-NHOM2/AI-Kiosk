from datetime import datetime, timedelta

import pytest
from app.core.enums import FailCode, Result
from app.core.security import hash_id_number
from app.services.rule_engine import IdentityInfo, TicketInfo, decide
from app.services.ticket_validator import VN_TZ, CheckinWindow

PEPPER = "test-pepper"
THRESHOLD = 0.5
WINDOW = CheckinWindow(timedelta(hours=24), timedelta(minutes=45))
DEPARTURE = datetime(2026, 12, 1, 10, 0, tzinfo=VN_TZ)
NOW_OK = DEPARTURE - timedelta(hours=3)

TICKET = TicketInfo(
    ticket_id="VN001",
    passenger_name="NGUYEN VAN AN",
    id_number_hash=hash_id_number("012345678901", PEPPER),
    booking_status="CONFIRMED",
    departure_time=DEPARTURE,
)
GOOD_IDENTITY = IdentityInfo(id_number="012345678901", name="Nguyễn Văn An")


def run(**overrides):
    """Chạy decide() với kịch bản TC01 (đúng hết), cho phép ghi đè từng phần."""
    args = {
        "ticket": TICKET,
        "identity": GOOD_IDENTITY,
        "liveness_passed": True,
        "face_score": 0.9,
        "now": NOW_OK,
        "pepper": PEPPER,
        "face_threshold": THRESHOLD,
        "window": WINDOW,
    }
    args.update(overrides)
    return decide(**args)


def test_tc01_all_correct_is_pass():
    d = run()
    assert d.result == Result.PASS
    assert d.fail_code is None and d.fail_message is None


def test_tc02_wrong_id():
    d = run(identity=IdentityInfo("999999999999", "Nguyễn Văn An"))
    assert (d.result, d.fail_code) == (Result.FAIL, FailCode.ID_MISMATCH)
    assert d.fail_message == "Số định danh không khớp"


def test_tc03_wrong_name():
    d = run(identity=IdentityInfo("012345678901", "Trần Thị Bình"))
    assert d.fail_code == FailCode.NAME_MISMATCH
    assert d.fail_message == "Họ tên không khớp"


def test_tc04_ticket_not_found():
    d = run(ticket=None)
    assert d.fail_code == FailCode.TICKET_NOT_FOUND
    assert d.fail_message == "Không tìm thấy vé"


def test_tc05_wrong_face():
    d = run(face_score=0.2)
    assert d.fail_code == FailCode.FACE_MISMATCH
    assert d.fail_message == "Khuôn mặt không khớp"


@pytest.mark.parametrize("offset", [timedelta(hours=-30), timedelta(hours=1)])
def test_tc06_invalid_time(offset):
    d = run(now=DEPARTURE + offset)
    assert d.fail_code == FailCode.TICKET_TIME_INVALID
    assert d.fail_message == "Vé không hợp lệ theo thời gian"


def test_tc07_liveness_fail():
    d = run(liveness_passed=False)
    assert d.fail_code == FailCode.LIVENESS_FAIL
    assert d.fail_message == "Liveness không đạt"


def test_id_in_qr_with_spaces_still_matches():
    assert run(identity=IdentityInfo("0123 4567 8901", "Nguyễn Văn An")).result == Result.PASS


def test_malformed_id_is_mismatch():
    assert run(identity=IdentityInfo("abc", "Nguyễn Văn An")).fail_code == FailCode.ID_MISMATCH
    assert run(identity=IdentityInfo(None, "Nguyễn Văn An")).fail_code == FailCode.ID_MISMATCH
    assert run(identity=None).fail_code == FailCode.ID_MISMATCH


def test_cancelled_ticket_fails():
    cancelled = TicketInfo(
        "VN001", "NGUYEN VAN AN", TICKET.id_number_hash, "CANCELLED", DEPARTURE
    )
    assert run(ticket=cancelled).fail_code == FailCode.TICKET_INVALID_STATUS


def test_face_score_equal_to_threshold_passes():
    assert run(face_score=THRESHOLD).result == Result.PASS


def test_missing_liveness_or_face_result_fails():
    assert run(liveness_passed=None).fail_code == FailCode.LIVENESS_FAIL
    assert run(face_score=None).fail_code == FailCode.FACE_MISMATCH


def test_priority_ticket_time_before_identity():
    d = run(now=DEPARTURE + timedelta(hours=1), identity=IdentityInfo("999999999999", "X"))
    assert d.fail_code == FailCode.TICKET_TIME_INVALID


def test_priority_id_before_name():
    d = run(identity=IdentityInfo("999999999999", "Trần Thị Bình"))
    assert d.fail_code == FailCode.ID_MISMATCH


def test_priority_liveness_before_face():
    d = run(liveness_passed=False, face_score=0.1)
    assert d.fail_code == FailCode.LIVENESS_FAIL
