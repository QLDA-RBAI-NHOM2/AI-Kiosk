import pytest
from kiosk_ai.types import LivenessErrorCode, LivenessResult, LivenessStatus


def test_pass_has_no_error_code():
    result = LivenessResult(status=LivenessStatus.PASS)
    assert result.error_code is LivenessErrorCode.NONE


def test_pass_with_error_code_is_rejected():
    with pytest.raises(ValueError):
        LivenessResult(status=LivenessStatus.PASS, error_code=LivenessErrorCode.NO_FACE)


def test_fail_requires_error_code():
    with pytest.raises(ValueError):
        LivenessResult(status=LivenessStatus.FAIL)


def test_status_values_are_stable_strings():
    assert LivenessStatus.PASS.value == "pass"
    assert LivenessStatus.FAIL.value == "fail"
    assert LivenessStatus.INSUFFICIENT_DATA.value == "insufficient_data"
