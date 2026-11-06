"""Chuẩn hóa họ tên tiếng Việt: trim, gộp khoảng trắng, IN HOA, và bỏ dấu để so sánh."""
import unicodedata


def normalize_name(raw: str | None) -> str:
    """'  nguyễn   văn  an ' -> 'NGUYỄN VĂN AN' (vẫn giữ dấu)."""
    text = unicodedata.normalize("NFC", raw or "")
    return " ".join(text.split()).upper()


def strip_diacritics(text: str) -> str:
    """'NGUYỄN VĂN ĐỨC' -> 'NGUYEN VAN DUC'. Chữ Đ/đ không tách được bằng Unicode nên đổi tay."""
    text = text.replace("Đ", "D").replace("đ", "d")
    decomposed = unicodedata.normalize("NFD", text)
    return "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")


def names_match(a: str | None, b: str | None) -> bool:
    """Hai tên khớp nếu giống nhau sau khi chuẩn hóa và bỏ dấu. Tên rỗng không bao giờ khớp."""
    na = strip_diacritics(normalize_name(a))
    nb = strip_diacritics(normalize_name(b))
    return bool(na) and na == nb
