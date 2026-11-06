import unicodedata

import pytest
from app.services.name_normalizer import names_match, normalize_name, strip_diacritics


def test_normalize_trims_collapses_and_uppercases():
    assert normalize_name("  nguyễn   văn  an ") == "NGUYỄN VĂN AN"


def test_normalize_none_is_empty():
    assert normalize_name(None) == ""


def test_strip_diacritics_handles_d_bar():
    assert strip_diacritics("NGUYỄN VĂN ĐỨC") == "NGUYEN VAN DUC"
    assert strip_diacritics("đặng") == "dang"


@pytest.mark.parametrize(
    ("a", "b"),
    [
        ("Nguyễn Văn An", "NGUYEN VAN AN"),
        ("  trần  thị  bình ", "TRẦN THỊ BÌNH"),
        ("Đỗ Minh Đức", "DO MINH DUC"),
    ],
)
def test_names_match(a, b):
    assert names_match(a, b)


def test_names_match_ignores_unicode_composition():
    composed = "Nguyễn Văn An"
    decomposed = unicodedata.normalize("NFD", composed)
    assert composed != decomposed
    assert names_match(composed, decomposed)


@pytest.mark.parametrize(
    ("a", "b"),
    [
        ("Nguyễn Văn An", "Nguyễn Văn Bình"),
        ("Nguyễn Văn An", "An Văn Nguyễn"),  # đảo thứ tự là khác tên
        ("", ""),
        (None, None),
        ("Nguyễn Văn An", None),
    ],
)
def test_names_do_not_match(a, b):
    assert not names_match(a, b)
