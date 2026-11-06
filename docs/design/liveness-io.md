# Giao diện module Liveness (đầu vào và đầu ra)

Người phụ trách: Trần Hải Nam. Người tích hợp: An Hoàng Anh. Căn cứ: hợp đồng 6868/2026/HĐ-PM khoản 5.1.c, 14.6; ADR 0007.
Trạng thái: các kiểu dữ liệu đã merge (`ai/kiosk_ai/types.py`). Hàm kiểm tra liveness **chưa có**; chữ ký dưới đây là dự kiến và sẽ giữ nguyên khi cài đặt.

## Đầu vào (dự kiến)

    # ai/kiosk_ai/liveness/checker.py
    def check_liveness(frames: Sequence[FrameSample]) -> LivenessResult: ...

- `FrameSample(image, timestamp_ms)`: `image` là ảnh BGR uint8 dạng HxWx3 lấy trực tiếp từ camera, **không lật gương**. Backend giải mã khung hình thành mảng ảnh và chỉ giữ trong bộ nhớ, không ghi ra đĩa, hủy sau phiên (khoản 14.2).
- Số khung hình tối thiểu và khoảng thời gian thu khung: **chưa chốt**, sẽ xác định bằng số đo thực nghiệm.

## Đầu ra: `LivenessResult`

| Trường | Ý nghĩa |
|---|---|
| `status` | `pass`, `fail` hoặc `insufficient_data` |
| `error_code` | `none` khi `pass`; bắt buộc khác `none` khi không `pass` |
| `score` | điểm hoặc đặc trưng nếu có, có thể là `None` |
| `details` | các số đo phụ (ví dụ số lần chớp mắt) |
| `processing_ms` | thời gian xử lý của module |
| `frames_used` | số khung hình đã dùng |

## Ánh xạ sang Backend (đã thống nhất với Hoàng Anh)

| Kết quả AI | Backend |
|---|---|
| `status = pass` | `SessionStatus.LIVENESS_OK` |
| `status = fail` (`no_liveness_signal`) | kết quả FAIL với `FailCode.LIVENESS_FAIL` (TC07) |
| `status = insufficient_data` (`no_face`, `multiple_faces`, `not_enough_frames`, `low_quality`) | `ErrorCode.LIVENESS_INSUFFICIENT_DATA`, HTTP 422, yêu cầu quét lại, không tạo FAIL |
| `error_code = model_error` | lỗi kỹ thuật `INTERNAL_ERROR`, không phải kết quả FAIL của phiên |

## Ngưỡng

Các ngưỡng liveness (EAR, số khung liên tiếp, góc quay đầu) **chưa có giá trị**, chỉ chốt sau thực nghiệm và công bố trong báo cáo (khoản 14.6). Khi `ai/kiosk_ai/thresholds.json` còn `"status": "UNCALIBRATED"`, `check_liveness` **không được trả `pass`**. Dự kiến sẽ ném lỗi rõ ràng để Backend dùng chế độ stub. Cách xử lý này cần Hoàng Anh xác nhận.

## Môi trường đã kiểm chứng

Python 3.12.16, mediapipe 1.2.0, numpy 2.5.4, opencv-contrib-python 5.0.0.93, model `face_landmarker.task` đặt ở `models/` (không commit).
Gói `kiosk-ai` đã được kiểm chứng cài được bằng `pip install --no-deps` từ wheel và bằng `pip install -e ./ai` (Python 3.12.16, venv sạch); wheel có cả `thresholds.json`.
TensorFlow và DeepFace thuộc nhánh khuôn mặt của Vũ, chưa kiểm chứng ở đây.
