"""Kiểu dữ liệu dùng chung giữa module AI và Backend.

Quy ước khung hình: ảnh BGR uint8 lấy trực tiếp từ camera, KHÔNG lật gương.
Hướng quay đầu được báo theo bên trái/phải của người dùng.
Module AI chỉ trả trạng thái hoặc điểm. Quyết định PASS/FAIL cuối cùng thuộc Rule Engine.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import numpy as np


class LivenessStatus(str, Enum):
    PASS = "pass"
    FAIL = "fail"
    INSUFFICIENT_DATA = "insufficient_data"


class LivenessErrorCode(str, Enum):
    NONE = "none"
    NO_FACE = "no_face"
    MULTIPLE_FACES = "multiple_faces"
    NOT_ENOUGH_FRAMES = "not_enough_frames"
    LOW_QUALITY = "low_quality"
    NO_LIVENESS_SIGNAL = "no_liveness_signal"
    MODEL_ERROR = "model_error"


@dataclass(frozen=True)
class FrameSample:
    """Một khung hình đầu vào của kiểm tra liveness."""

    image: np.ndarray
    timestamp_ms: int


@dataclass(frozen=True)
class LivenessResult:
    """Kết quả kiểm tra liveness trên một chuỗi khung hình."""

    status: LivenessStatus
    error_code: LivenessErrorCode = LivenessErrorCode.NONE
    score: float | None = None
    details: dict[str, float] = field(default_factory=dict)
    processing_ms: float = 0.0
    frames_used: int = 0

    def __post_init__(self) -> None:
        if self.status is LivenessStatus.PASS and self.error_code is not LivenessErrorCode.NONE:
            raise ValueError("status PASS không được kèm mã lỗi")
        if self.status is not LivenessStatus.PASS and self.error_code is LivenessErrorCode.NONE:
            raise ValueError("status FAIL hoặc INSUFFICIENT_DATA phải có mã lỗi")
