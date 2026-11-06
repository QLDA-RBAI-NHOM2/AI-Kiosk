import pytest
from kiosk_ai.liveness.blink_ear import (
    EYE_INDICES,
    count_blinks,
    ear_from_landmarks,
    eye_aspect_ratio,
)

OPEN_EYE = [(0, 0), (10, 10), (30, 10), (40, 0), (30, -10), (10, -10)]
CLOSED_EYE = [(0, 0), (10, 0), (30, 0), (40, 0), (30, 0), (10, 0)]


def test_open_eye_has_expected_ratio():
    assert eye_aspect_ratio(OPEN_EYE) == pytest.approx(0.5)


def test_closed_eye_has_zero_ratio():
    assert eye_aspect_ratio(CLOSED_EYE) == pytest.approx(0.0)


def test_wrong_point_count_is_rejected():
    with pytest.raises(ValueError):
        eye_aspect_ratio(OPEN_EYE[:5])


def test_zero_eye_width_is_rejected():
    with pytest.raises(ValueError):
        eye_aspect_ratio([(1, 1)] * 6)


def test_landmarks_are_scaled_by_image_size():
    width, height = 200, 100
    landmarks = [(0.0, 0.0, 0.0)] * 478
    for index, (x, y) in zip(EYE_INDICES["eye_33"], OPEN_EYE, strict=True):
        landmarks[index] = ((x + 50) / width, (y + 50) / height, 0.0)
    ear = ear_from_landmarks(landmarks, EYE_INDICES["eye_33"], width, height)
    assert ear == pytest.approx(0.5)


def test_count_blinks_ignores_short_dips_and_unfinished_closure():
    series = [0.3, 0.3, 0.1, 0.1, 0.3, 0.1, 0.3, 0.1, 0.1, 0.1]
    assert count_blinks(series, threshold=0.2, min_consecutive_frames=2) == 1


def test_count_blinks_requires_positive_run_length():
    with pytest.raises(ValueError):
        count_blinks([0.3], threshold=0.2, min_consecutive_frames=0)
