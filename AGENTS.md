# Quy tắc cho trợ lý AI và người viết code

Nguồn quy tắc chính là hợp đồng 6868/2026/HĐ-PM và CONTRIBUTING.md.
- Liveness dùng MediaPipe Face Mesh; xác minh khuôn mặt dùng ArcFace qua DeepFace. Đổi thư viện cần Bên A chấp thuận (khoản 5.3).
- Ngưỡng chỉ được chọn từ thực nghiệm có báo cáo (khoản 14.6). Không điền giá trị ngưỡng khi chưa có số liệu.
- Module AI chỉ trả điểm hoặc trạng thái. Quyết định PASS/FAIL thuộc Rule Engine ở Backend.
- Không commit ảnh khuôn mặt, weights, `.env`, hồ sơ hợp đồng. Không ghi nguyên số định danh vào log.
- Không bịa số liệu kiểm thử, độ chính xác hay thời gian xử lý.
