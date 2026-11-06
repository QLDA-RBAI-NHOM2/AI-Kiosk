import pytest
from kiosk_ai.liveness.landmarks import FaceLandmarkExtractor, validate_frame


class _FakeFrame:
    def __init__(self, shape, dtype="uint8"):
        self.shape = shape
        self.dtype = dtype


def test_missing_model_raises_clear_error(tmp_path):
    with pytest.raises(FileNotFoundError):
        FaceLandmarkExtractor(model_path=tmp_path / "none.task")


def test_max_faces_must_be_positive(tmp_path):
    model = tmp_path / "x.task"
    model.write_bytes(b"")
    with pytest.raises(ValueError):
        FaceLandmarkExtractor(model_path=model, max_faces=0)


def test_validate_frame_accepts_bgr_uint8():
    validate_frame(_FakeFrame((480, 640, 3)))


@pytest.mark.parametrize(
    ("shape", "dtype"),
    [
        ((480, 640), "uint8"),
        ((480, 640, 4), "uint8"),
        ((480, 640, 3), "float32"),
        ((0, 640, 3), "uint8"),
    ],
)
def test_validate_frame_rejects_bad_input(shape, dtype):
    with pytest.raises(ValueError):
        validate_frame(_FakeFrame(shape, dtype))
