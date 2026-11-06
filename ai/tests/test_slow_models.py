import pytest
from kiosk_ai.liveness.landmarks import DEFAULT_MODEL_PATH, FaceLandmarkExtractor

pytestmark = pytest.mark.slow


@pytest.mark.skipif(not DEFAULT_MODEL_PATH.is_file(), reason="chưa tải models/face_landmarker.task")
def test_blank_frame_has_no_face():
    np = pytest.importorskip("numpy")
    pytest.importorskip("mediapipe")
    with FaceLandmarkExtractor() as extractor:
        assert extractor.detect(np.zeros((480, 640, 3), dtype=np.uint8)) == []
