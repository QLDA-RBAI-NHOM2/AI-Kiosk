from app.core.security import hash_id_number, hashes_equal, mask_id


def test_hash_is_deterministic():
    assert hash_id_number("012345678901", "p") == hash_id_number("012345678901", "p")


def test_hash_depends_on_pepper_and_input():
    base = hash_id_number("012345678901", "pepper-1")
    assert base != hash_id_number("012345678901", "pepper-2")
    assert base != hash_id_number("012345678902", "pepper-1")


def test_hash_does_not_contain_plain_id():
    assert "012345678901" not in hash_id_number("012345678901", "p")


def test_hashes_equal():
    h = hash_id_number("012345678901", "p")
    assert hashes_equal(h, h)
    assert not hashes_equal(h, hash_id_number("999999999999", "p"))


def test_mask_id_keeps_last_four_only():
    assert mask_id("012345678901") == "********8901"
    assert mask_id("123") == "***"
