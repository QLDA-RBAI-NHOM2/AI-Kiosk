"""Chuẩn hóa số định danh (CCCD mô phỏng) trước khi hash/so khớp."""
import re
import unicodedata

ID_LENGTH = 12  # CCCD: 12 chữ số. Nếu dataset của Thành khác thì sửa ở đây.

_SEPARATORS = re.compile(r"[\s.\-_/]")


def normalize_id(raw: str | None) -> str | None:
    """Trả về chuỗi 12 chữ số, hoặc None nếu không hợp lệ.

    Bỏ khoảng trắng và dấu . - _ /; đổi chữ số toàn-góc về chữ số thường.
    Giữ nguyên số 0 đứng đầu (vì là chuỗi, không phải số).
    """
    if raw is None:
        return None
    text = unicodedata.normalize("NFKC", raw)
    text = _SEPARATORS.sub("", text)
    if len(text) != ID_LENGTH or not text.isascii() or not text.isdigit():
        return None
    return text
