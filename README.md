# AI eGate

Hệ thống nhận diện và xác thực hành khách bằng AI phục vụ mô phỏng thông quan tự động tại sân bay (Hợp đồng số 6868/2026/HĐ-PM). Đây là hệ thống mô phỏng, chạy cục bộ hoặc trong mạng LAN.

## Kiến trúc
Frontend kiosk (web) ↔ Backend API (FastAPI) ↔ Module AI (OpenCV, pyzbar, DeepFace/ArcFace, MediaPipe Face Mesh) ↔ PostgreSQL.

Luồng 08 bước: quét QR vé, tra cứu vé, quét QR định danh, đối chiếu thông tin, liveness, so khớp khuôn mặt, Rule Engine quyết định PASS/FAIL, hiển thị kết quả cùng thời gian xử lý.

## Nguyên tắc bảo mật
Chạy offline, không gửi dữ liệu ra Internet, không lưu ảnh thô sau phiên, số định danh luôn được ẩn hoặc hash. Chi tiết: [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md).

## Cấu trúc thư mục
| Thư mục | Nội dung |
|---|---|
| `frontend/` | Giao diện kiosk |
| `backend/` | FastAPI, Rule Engine, truy cập CSDL |
| `ai/` | Module QR, tiền xử lý và so khớp khuôn mặt, liveness, thực nghiệm đánh giá |
| `db/`, `data/` | Lược đồ, chỉ mục, dữ liệu mô phỏng |
| `tests/`, `e2e/` | Kiểm thử chấp nhận TC01 đến TC08, hiệu năng, bảo mật |
| `scripts/` | Công cụ dữ liệu, QR, AI, vận hành |
| `docs/` | Tài liệu kỹ thuật, kiểm thử, vận hành, quản lý dự án |

## Phân công
| Thành viên | Phụ trách |
|---|---|
| Nguyễn Công Thành | CSDL, dữ liệu giả lập, QR, bộ ảnh kiểm thử |
| Lê Đỗ Gia Vũ | AI: đọc QR, tiền xử lý, xác minh khuôn mặt |
| Trần Hải Nam | AI: liveness, ngưỡng, FAR/FRR, kiểm thử AI |
| An Hoàng Anh | Backend, Rule Engine, bảo mật, tích hợp, E2E |
| Nguyễn Xuân Nhật | Frontend kiosk |
| Lê Thế Phúc | Hồ sơ, tiến độ, thanh toán |

## Cài đặt và chạy
Chưa có. Hướng dẫn sẽ được bổ sung khi các module chạy được (yêu cầu của khoản 6.1 hợp đồng).
