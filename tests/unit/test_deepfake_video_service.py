from __future__ import annotations

import tempfile
from pathlib import Path

import cv2
import numpy as np
import pytest

from backend.services.deepfake_service import DeepfakeImageService


def _synthetic_video(frame_count: int = 9, fps: float = 3.0) -> bytes:
    with tempfile.NamedTemporaryFile(suffix=".avi", delete=False) as target:
        path = Path(target.name)
    writer = cv2.VideoWriter(
        str(path), cv2.VideoWriter_fourcc(*"MJPG"), fps, (64, 64)
    )
    assert writer.isOpened()
    for index in range(frame_count):
        writer.write(np.full((64, 64, 3), index * 20, dtype=np.uint8))
    writer.release()
    try:
        return path.read_bytes()
    finally:
        path.unlink(missing_ok=True)


def test_video_frame_sampling_aggregates_real_image_predictions(monkeypatch: pytest.MonkeyPatch):
    service = DeepfakeImageService("unused.onnx")
    scores = iter([0.1, 0.2, 0.85, 0.9, 0.8, 0.75])

    def predict(_image):
        fake = next(scores)
        return 1 - fake, fake

    monkeypatch.setattr(service, "_predict", predict)
    result = service.analyze_video(_synthetic_video(6), suffix=".avi", max_frames=6)

    assert result.sampled_frames == 6
    assert result.suspicious_frames == 4
    assert result.verdict == "likely_fake"
    assert result.decision == "WARN"
    assert len(result.frame_results) == 6
    assert result.duration_seconds == pytest.approx(2.0)


def test_video_rejects_empty_and_oversized_payloads():
    service = DeepfakeImageService("unused.onnx")
    with pytest.raises(ValueError, match="rỗng"):
        service.analyze_video(b"")
    with pytest.raises(ValueError, match="50 MB"):
        service.analyze_video(b"x" * (50 * 1024 * 1024 + 1))
