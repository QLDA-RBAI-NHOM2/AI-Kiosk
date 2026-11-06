"""Chỉ số EAR (Eye Aspect Ratio) tính từ landmark của MediaPipe Face Landmarker.

EAR = (|p2 - p6| + |p3 - p5|) / (2 * |p1 - p4|), theo Soukupová và Čech (2016).
p1, p4 là hai khóe mắt; p2, p3 là mí trên; p5, p6 là mí dưới.

Module này KHÔNG chứa giá trị ngưỡng nào. Ngưỡng phải chọn từ số đo thực nghiệm
và công bố trong báo cáo (hợp đồng khoản 14.6).
"""

from __future__ import annotations

from collections.abc import Sequence
from math import dist

# Sáu chỉ số landmark của mỗi mắt, theo thứ tự p1, p2, p3, p4, p5, p6.
# Đây là bộ chỉ số phổ biến cho lưới 468 điểm, cần được xác nhận bằng số đo thật.
EYE_INDICES: dict[str, tuple[int, int, int, int, int, int]] = {
    "eye_33": (33, 160, 158, 133, 153, 144),
    "eye_362": (362, 385, 387, 263, 373, 380),
}


def eye_aspect_ratio(points: Sequence[tuple[float, float]]) -> float:
    """Tính EAR từ 6 điểm (p1..p6) theo tọa độ pixel."""
    if len(points) != 6:
        raise ValueError("Cần đúng 6 điểm cho mỗi mắt")
    p1, p2, p3, p4, p5, p6 = points
    horizontal = dist(p1, p4)
    if horizontal == 0:
        raise ValueError("Khoảng cách hai khóe mắt bằng 0")
    return (dist(p2, p6) + dist(p3, p5)) / (2.0 * horizontal)


def ear_from_landmarks(
    landmarks: Sequence[Sequence[float]],
    indices: Sequence[int],
    width: int,
    height: int,
) -> float:
    """Tính EAR từ landmark chuẩn hóa (x, y trong 0..1).

    Phải nhân với kích thước ảnh trước khi tính khoảng cách, nếu không ảnh không vuông
    (ví dụ 640x480) sẽ làm lệch tỷ lệ.
    """
    if width < 1 or height < 1:
        raise ValueError("width và height phải >= 1")
    points = [(float(landmarks[i][0]) * width, float(landmarks[i][1]) * height) for i in indices]
    return eye_aspect_ratio(points)


def count_blinks(ear_series: Sequence[float], threshold: float, min_consecutive_frames: int) -> int:
    """Đếm số lần chớp mắt trong chuỗi EAR.

    Một lần chớp là đoạn liên tiếp EAR < threshold dài ít nhất min_consecutive_frames
    khung hình, rồi mắt mở lại. Đoạn còn dở ở cuối chuỗi (mắt vẫn nhắm) không được đếm.
    """
    if min_consecutive_frames < 1:
        raise ValueError("min_consecutive_frames phải >= 1")
    blinks = 0
    run = 0
    for ear in ear_series:
        if ear < threshold:
            run += 1
            continue
        if run >= min_consecutive_frames:
            blinks += 1
        run = 0
    return blinks
