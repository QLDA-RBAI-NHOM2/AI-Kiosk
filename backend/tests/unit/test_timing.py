import pytest

from app.core.timing import STEP_FIELDS, StepTimer


def test_timer_records_step_and_total():
    t = StepTimer()
    with t.measure("db_lookup_ms"):
        pass
    d = t.as_dict()
    assert d["db_lookup_ms"] is not None
    assert d["total_ms"] >= d["db_lookup_ms"]
    assert set(d) == set(STEP_FIELDS) | {"total_ms"}  # đủ 7 trường


def test_timer_rejects_unknown_field():
    with pytest.raises(ValueError):
        with StepTimer().measure("khong_ton_tai"):
            pass
