"""Hash số định danh (ADR 0002: HMAC-SHA256 + pepper) và che số khi ghi log."""
import hashlib
import hmac


def hash_id_number(normalized_id: str, pepper: str) -> str:
    """Băm số định danh ĐÃ CHUẨN HÓA. Pepper là bí mật nằm trong .env, không nằm trong DB."""
    return hmac.new(pepper.encode(), normalized_id.encode(), hashlib.sha256).hexdigest()


def hashes_equal(a: str, b: str) -> bool:
    """So sánh hai hash theo thời gian không đổi (tránh lộ thông tin qua thời gian so sánh)."""
    return hmac.compare_digest(a.encode(), b.encode())


def mask_id(id_number: str) -> str:
    """Chỉ giữ 4 số cuối khi ghi log: 012345678901 -> ********8901."""
    if len(id_number) <= 4:
        return "*" * len(id_number)
    return "*" * (len(id_number) - 4) + id_number[-4:]
