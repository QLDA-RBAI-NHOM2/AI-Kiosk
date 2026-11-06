"""Các giá trị cố định dùng chung. Đây là 'từ điển' giữa backend và frontend của Nhật."""
from enum import Enum


class SessionStatus(str, Enum):
    CREATED = "CREATED"            # vừa tạo phiên
    TICKET_OK = "TICKET_OK"        # đã có vé hợp lệ
    IDENTITY_OK = "IDENTITY_OK"    # CCCD + tên khớp
    LIVENESS_OK = "LIVENESS_OK"    # qua kiểm tra sống
    DONE = "DONE"                  # đã có kết quả PASS/FAIL


class Result(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"


class FailCode(str, Enum):
    """Lý do FAIL NGHIỆP VỤ (khớp TC02–TC07 trong Phụ lục 02)."""
    TICKET_NOT_FOUND = "TICKET_NOT_FOUND"        # TC04
    TICKET_TIME_INVALID = "TICKET_TIME_INVALID"  # TC06
    ID_MISMATCH = "ID_MISMATCH"                  # TC02
    NAME_MISMATCH = "NAME_MISMATCH"              # TC03
    LIVENESS_FAIL = "LIVENESS_FAIL"              # TC07
    FACE_MISMATCH = "FACE_MISMATCH"              # TC05
    TICKET_INVALID_STATUS = "TICKET_INVALID_STATUS"  # vé đã hủy / không còn hiệu lực

# Thông báo tiếng Việt hiển thị trên kiosk, đúng chữ trong hợp đồng.
FAIL_MESSAGES: dict[FailCode, str] = {
    FailCode.TICKET_NOT_FOUND: "Không tìm thấy vé",
    FailCode.TICKET_TIME_INVALID: "Vé không hợp lệ theo thời gian",
    FailCode.ID_MISMATCH: "Số định danh không khớp",
    FailCode.NAME_MISMATCH: "Họ tên không khớp",
    FailCode.LIVENESS_FAIL: "Liveness không đạt",
    FailCode.FACE_MISMATCH: "Khuôn mặt không khớp",
    FailCode.TICKET_INVALID_STATUS: "Vé đã bị hủy hoặc không còn hiệu lực",
}


class ErrorCode(str, Enum):
    """Lỗi KỸ THUẬT của API (khác FailCode: đây không phải kết quả FAIL của phiên)."""
    QR_UNREADABLE = "QR_UNREADABLE"        # TC08: yêu cầu quét lại, KHÔNG tạo phiên lỗi
    SESSION_NOT_FOUND = "SESSION_NOT_FOUND"
    SESSION_EXPIRED = "SESSION_EXPIRED"
    INVALID_STATE = "INVALID_STATE"        # gọi sai thứ tự bước
    INVALID_REQUEST = "INVALID_REQUEST"    # dữ liệu gửi lên sai định dạng
    INTERNAL_ERROR = "INTERNAL_ERROR"
    LIVENESS_INSUFFICIENT_DATA = "LIVENESS_INSUFFICIENT_DATA"