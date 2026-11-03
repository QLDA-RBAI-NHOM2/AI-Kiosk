# ADR 0007: Liveness bằng MediaPipe Face Landmarker và khung hình không lật gương

- Trạng thái: Đề xuất. Chờ Nhật xác nhận quy ước khung hình, và Phúc thông báo Bên A (khoản 5.3, 9.3)
- Người phụ trách: Trần Hải Nam
- Căn cứ hợp đồng 6868/2026/HĐ-PM: khoản 5.1.c, 14.1, 14.6; Phụ lục 01 mục 5; Phụ lục 02 mục 1

## Bối cảnh
Hợp đồng yêu cầu kiểm tra sống (liveness) bằng MediaPipe Face Mesh (chớp mắt hoặc cử động đầu), chạy cục bộ, không gửi dữ liệu ra Internet.
Trên môi trường đã thử (Python 3.12.16, mediapipe 1.2.0):
- module `mediapipe.solutions` (Face Mesh bản cũ) không còn;
- `FaceLandmarker` (Tasks API) có sẵn, đọc model từ file cục bộ;
- một lần chạy thử với webcam trả về 1 khuôn mặt và 478 landmark.

Prototype trước đó (YuNet 5 điểm, ngưỡng cố định) bị loại vì lệch hợp đồng và ngưỡng chưa có thực nghiệm (PR #7).

## Quyết định
1. Dùng MediaPipe Face Landmarker (Tasks API), phiên bản kế nhiệm của Face Mesh, để lấy landmark cho EAR (chớp mắt) và cử động đầu.
2. Model `face_landmarker.task` tải một lần khi cài môi trường, lưu ở `models/` và không commit (bị `.gitignore`). Khi chạy không cần Internet.
3. Module liveness nhận khung hình BGR gốc từ camera, **không lật gương**. Hướng quay đầu được báo theo bên trái/phải của người dùng.
4. Frontend chỉ lật hình xem trước ở bước khuôn mặt bằng CSS. Khung hình gửi đi vẫn là khung gốc. Ở bước quét QR không lật.
5. Kết quả trả về theo `LivenessResult` (`ai/kiosk_ai/types.py`): trạng thái đạt, không đạt hoặc chưa đủ dữ liệu, mã lỗi AI, điểm nếu có, thời gian xử lý.
6. Các ngưỡng liveness (EAR, góc quay) và ngưỡng so khớp khuôn mặt **chưa có giá trị**. Chỉ chốt sau thực nghiệm và công bố trong báo cáo (khoản 14.6). Cho đến lúc đó `ai/kiosk_ai/thresholds.json` ở trạng thái `UNCALIBRATED`.

## Hệ quả
- Số liệu FAR/FRR đo trên khung hình không lật, cùng định dạng với ảnh tham chiếu của Thành.
- Nhật cần đảm bảo canvas dùng để chụp không bị lật khi hình xem trước bị lật bằng CSS.
- Cần kiểm tra trên từng webcam xem trình duyệt hoặc driver có trả ảnh đã lật sẵn hay không.
- Phụ thuộc: `mediapipe>=1.2,<2` kéo theo `opencv-contrib-python`. Không cài thêm `opencv-python` cùng môi trường.
- Chưa có số đo độ chính xác hay độ trễ của liveness. Các số này được đo ở GĐ3 đến GĐ5.
