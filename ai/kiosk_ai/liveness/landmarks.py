"""Nạp MediaPipe Face Landmarker và trả landmark khuôn mặt cho một khung hình.

Khung hình: ảnh BGR uint8 lấy trực tiếp từ camera, KHÔNG lật gương (xem ADR 0007).
Model chạy hoàn toàn cục bộ từ file .task, không cần Internet.
"""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING, Self

if TYPE_CHECKING:
    import numpy as np

NUM_LANDMARKS = 478
DEFAULT_MODEL_PATH = Path(__file__).resolve().parents[3] / "models" / "face_landmarker.task"


def validate_frame(frame: object) -> None:
    """Kiểm tra khung hình là ảnh BGR uint8 dạng HxWx3 (không cần import numpy)."""
    shape = getattr(frame, "shape", None)
    dtype = getattr(frame, "dtype", None)
    if shape is None or len(shape) != 3 or shape[2] != 3 or min(shape[:2]) < 1:
        raise ValueError("Khung hình phải có dạng HxWx3 và không rỗng")
    if str(dtype) != "uint8":
        raise ValueError("Khung hình phải là uint8")


class FaceLandmarkExtractor:
    """Bọc FaceLandmarker. Dùng với `with` hoặc gọi close() khi xong."""

    def __init__(self, model_path: Path | str = DEFAULT_MODEL_PATH, max_faces: int = 2) -> None:
        path = Path(model_path)
        if not path.is_file():
            raise FileNotFoundError(
                f"Không thấy model Face Landmarker: {path}. "
                "Tải face_landmarker.task một lần vào thư mục models/ (file không được commit)."
            )
        if max_faces < 1:
            raise ValueError("max_faces phải >= 1")
        from mediapipe.tasks import python as mp_python
        from mediapipe.tasks.python import vision

        options = vision.FaceLandmarkerOptions(
            base_options=mp_python.BaseOptions(model_asset_path=str(path)),
            running_mode=vision.RunningMode.IMAGE,
            num_faces=max_faces,
        )
        self._landmarker = vision.FaceLandmarker.create_from_options(options)

    def detect(self, frame_bgr: np.ndarray) -> list[np.ndarray]:
        """Trả danh sách landmark, mỗi khuôn mặt là mảng (478, 3) gồm x, y, z chuẩn hóa."""
        if self._landmarker is None:
            raise RuntimeError("Extractor đã đóng")
        validate_frame(frame_bgr)
        import cv2
        import mediapipe as mp
        import numpy as np

        rgb = np.ascontiguousarray(cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB))
        result = self._landmarker.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb))
        return [
            np.array([[p.x, p.y, p.z] for p in face], dtype=np.float32)
            for face in result.face_landmarks
        ]

    def close(self) -> None:
        if self._landmarker is not None:
            self._landmarker.close()
            self._landmarker = None

    def __enter__(self) -> Self:
        return self

    def __exit__(self, *exc_info: object) -> None:
        self.close()
