import pytest
from app.services.id_normalizer import normalize_id


@pytest.mark.parametrize(
    "raw",
    [
        "012345678901",
        "0123 4567 8901",
        "012-345-678-901",
        "012.345.678.901",
        "  012345678901\n",
        "０１２３４５６７８９０１",  # chữ số toàn-góc
    ],
)
def test_valid_ids_are_normalized(raw):
    assert normalize_id(raw) == "012345678901"


@pytest.mark.parametrize(
    "raw",
    [
        None,
        "",
        "12345",  # quá ngắn
        "0123456789012",  # 13 số
        "01234567890a",  # có chữ
        "٠١٢٣٤٥٦٧٨٩٠١",  # chữ số Ả Rập, không phải 0-9 thường
    ],
)
def test_invalid_ids_return_none(raw):
    assert normalize_id(raw) is None


def test_leading_zero_is_kept():
    assert normalize_id("000000000001") == "000000000001"
