"""Đo thời gian từng bước. 7 trường theo Phụ lục 01 mục 8 của hợp đồng."""
from contextlib import contextmanager
from time import perf_counter

STEP_FIELDS = (
    "qr_ticket_ms",
    "db_lookup_ms",
    "qr_identity_ms",
    "text_match_ms",
    "liveness_ms",
    "face_verify_ms",
)


class StepTimer:
    """Cách dùng:
        timer = StepTimer()
        with timer.measure("db_lookup_ms"):
            ...tra DB...
        timer.as_dict()  # -> {"qr_ticket_ms": None, "db_lookup_ms": 12.3, ..., "total_ms": 40.1}
    """

    def __init__(self) -> None:
        self._start = perf_counter()
        self.values: dict[str, float | None] = {f: None for f in STEP_FIELDS}

    @contextmanager
    def measure(self, field: str):
        if field not in self.values:
            raise ValueError(f"Trường thời gian không tồn tại: {field}")
        t0 = perf_counter()
        try:
            yield
        finally:
            self.values[field] = round((perf_counter() - t0) * 1000, 1)

    def as_dict(self) -> dict[str, float | None]:
        # LƯU Ý: total_ms tính từ lúc tạo timer tới giờ. Cần chốt trong ADR 0006
        # là tính từ đâu (từ lúc quét QR vé? hay từ lúc tạo phiên?).
        out = dict(self.values)
        out["total_ms"] = round((perf_counter() - self._start) * 1000, 1)
        return out
