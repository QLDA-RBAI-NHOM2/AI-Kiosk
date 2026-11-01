# Hướng dẫn đóng góp

## Nguyên tắc bắt buộc (hợp đồng 6868/2026/HĐ-PM, Điều 14)
- Chỉ dùng dữ liệu mô phỏng hoặc dữ liệu của người đã đồng ý bằng văn bản. Không dùng ảnh căn cước thật.
- Xử lý hoàn toàn cục bộ, không gửi QR, ảnh mặt hay embedding ra Internet, không dùng dịch vụ AI đám mây.
- Không commit: ảnh khuôn mặt, video, model weights, `.env`, khóa, hồ sơ hợp đồng hay thanh toán, bảng lương.
- Số định danh trong log chỉ hiển thị dạng `****1234` hoặc hash. Trong CSDL lưu `id_number_hash`.
- Không lưu ảnh live sau khi xử lý xong phiên.
- Phát hiện rò rỉ: báo cho Hoàng Anh và Phúc trong 24 giờ (khoản 14.7).

## Nhánh và commit
- Không push thẳng vào `main`. Mỗi thay đổi một nhánh, một PR.
- Tên nhánh: `feature/<module>-<mô-tả>`, `fix/...`, `chore/...`, `docs/...`.
- Commit theo dạng `feat(ai): ...`, `fix(backend): ...`, `chore: ...`, `docs: ...`.

## Pull request
- Điền đủ mẫu PR, gắn issue (`Closes #...`).
- Cần ít nhất 1 người trong CODEOWNERS của đường dẫn đó duyệt. Không tự merge PR của mình khi chưa có người duyệt.
- Thay đổi ngưỡng, mô hình, logic đối chiếu hay cấu trúc CSDL có thể buộc chạy lại kiểm thử (khoản 6.9): ghi rõ trong PR.
- Đổi thư viện hoặc mô hình pretrained cần Bên A chấp thuận bằng văn bản (khoản 5.3): tạo issue "Yêu cầu thay đổi" trước khi code.

## Thời hạn sửa lỗi (khoản 6.8)
Lỗi Nghiêm trọng: 3 ngày. Lỗi Trung bình: 5 ngày. Lỗi Nhẹ: trước nghiệm thu bàn giao.

## Kiểm tra trước khi tạo PR
```bash
pip install pre-commit ruff pytest
pre-commit install
ruff check --config pyproject.toml .
bash scripts/ops/check_forbidden_files.sh
```
