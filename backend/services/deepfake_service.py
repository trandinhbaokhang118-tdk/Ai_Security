"""Local ONNX screening for AI-generated or manipulated still images."""

from __future__ import annotations

import io
import os
import tempfile
import threading
import time
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort
from PIL import Image, UnidentifiedImageError


@dataclass(frozen=True)
class DeepfakeImageResult:
    width: int
    height: int
    image_format: str
    real_probability: float
    fake_probability: float
    verdict: str
    decision: str
    analysis_time_ms: int
    evidence: list[str]


@dataclass(frozen=True)
class DeepfakeVideoResult:
    duration_seconds: float
    width: int
    height: int
    sampled_frames: int
    suspicious_frames: int
    real_probability: float
    fake_probability: float
    verdict: str
    decision: str
    analysis_time_ms: int
    evidence: list[str]
    frame_results: list[dict[str, float | int | str]]


class DeepfakeImageService:
    """Lazy, thread-safe wrapper around the quantized ViT ONNX model."""

    model_version = "capcheck-ai-image-detection-vit-q4"

    def __init__(self, model_path: str) -> None:
        self.model_path = Path(model_path)
        self._session: ort.InferenceSession | None = None
        self._lock = threading.Lock()
        self._video_slots = threading.BoundedSemaphore(value=2)

    @property
    def available(self) -> bool:
        return self.model_path.is_file()

    def _get_session(self) -> ort.InferenceSession:
        if self._session is not None:
            return self._session
        with self._lock:
            if self._session is None:
                if not self.model_path.is_file():
                    raise RuntimeError("Deepfake image model is not installed")
                self._session = ort.InferenceSession(
                    str(self.model_path), providers=["CPUExecutionProvider"]
                )
        return self._session

    def analyze(self, data: bytes) -> DeepfakeImageResult:
        if not data:
            raise ValueError("Tệp ảnh rỗng")
        if len(data) > 15 * 1024 * 1024:
            raise ValueError("Ảnh vượt quá giới hạn 15 MB")

        started = time.perf_counter()
        try:
            with Image.open(io.BytesIO(data)) as source:
                source.verify()
            with Image.open(io.BytesIO(data)) as source:
                width, height = source.size
                image_format = source.format or "UNKNOWN"
                if width < 32 or height < 32:
                    raise ValueError("Ảnh phải có kích thước tối thiểu 32x32")
                if width * height > 25_000_000:
                    raise ValueError("Ảnh có quá nhiều pixel để phân tích an toàn")
                image = source.convert("RGB").resize((224, 224), Image.Resampling.BICUBIC)
        except (UnidentifiedImageError, OSError) as exc:
            raise ValueError("Định dạng ảnh không hợp lệ hoặc đã bị hỏng") from exc

        real_probability, fake_probability = self._predict(image)

        if fake_probability >= 0.65:
            verdict = "likely_fake"
            decision = "WARN"
        elif fake_probability <= 0.35:
            verdict = "likely_real"
            decision = "ALLOW"
        else:
            verdict = "uncertain"
            decision = "REVIEW"

        evidence = [
            f"Model pixel-forensics: FAKE {fake_probability:.1%}",
            f"Model pixel-forensics: REAL {real_probability:.1%}",
            f"Ảnh {image_format} {width}x{height} được chuẩn hóa về RGB 224x224",
        ]
        return DeepfakeImageResult(
            width=width,
            height=height,
            image_format=image_format,
            real_probability=round(real_probability, 6),
            fake_probability=round(fake_probability, 6),
            verdict=verdict,
            decision=decision,
            analysis_time_ms=round((time.perf_counter() - started) * 1000),
            evidence=evidence,
        )

    def _predict(self, image: Image.Image) -> tuple[float, float]:
        """Run the packaged image classifier on one RGB PIL image."""
        normalized = image.convert("RGB").resize((224, 224), Image.Resampling.BICUBIC)
        pixels = np.asarray(normalized, dtype=np.float32) / 255.0
        pixels = (pixels - 0.5) / 0.5
        tensor = np.transpose(pixels, (2, 0, 1))[None, ...]
        logits = self._get_session().run(["logits"], {"pixel_values": tensor})[0][0]
        shifted = logits - np.max(logits)
        probabilities = np.exp(shifted) / np.exp(shifted).sum()
        return float(probabilities[0]), float(probabilities[1])

    def analyze_video(
        self, data: bytes, *, suffix: str = ".mp4", max_frames: int = 12
    ) -> DeepfakeVideoResult:
        """Sample frames uniformly and aggregate the existing image detector.

        This is a screening signal, not a temporal deepfake detector: audio,
        motion consistency and frame-to-frame manipulation are not analyzed.
        """
        if not data:
            raise ValueError("Tệp video rỗng")
        if len(data) > 50 * 1024 * 1024:
            raise ValueError("Video vượt quá giới hạn 50 MB")
        if max_frames < 3 or max_frames > 24:
            raise ValueError("Số frame lấy mẫu phải từ 3 đến 24")
        if not self._video_slots.acquire(blocking=False):
            raise RuntimeError("Hệ thống đang phân tích tối đa 2 video; vui lòng thử lại")

        started = time.perf_counter()
        temp_path = ""
        capture: cv2.VideoCapture | None = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp:
                temp.write(data)
                temp_path = temp.name
            capture = cv2.VideoCapture(temp_path)
            if not capture.isOpened():
                raise ValueError("Không thể giải mã video hoặc định dạng không được hỗ trợ")

            frame_count_raw = float(capture.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = float(capture.get(cv2.CAP_PROP_FPS))
            width_raw = float(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
            height_raw = float(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
            metadata = (frame_count_raw, fps, width_raw, height_raw)
            if not all(np.isfinite(value) for value in metadata):
                raise ValueError("Video không có metadata frame hợp lệ")
            # Bound hostile or corrupt container metadata before converting it
            # to integers or passing it into NumPy frame-index calculations.
            if frame_count_raw <= 0 or frame_count_raw > 1_000_000 or fps <= 0 or fps > 1_000:
                raise ValueError("Video không có metadata frame hợp lệ")
            frame_count = int(frame_count_raw)
            width = int(width_raw)
            height = int(height_raw)
            if width < 32 or height < 32:
                raise ValueError("Video không có metadata frame hợp lệ")
            duration = frame_count / fps
            if duration > 120:
                raise ValueError("Video dài quá giới hạn 120 giây")
            if width * height > 25_000_000:
                raise ValueError("Video có độ phân giải quá lớn để phân tích an toàn")

            sample_count = min(max_frames, frame_count)
            indices = np.unique(np.linspace(0, frame_count - 1, sample_count, dtype=int))
            frame_results: list[dict[str, float | int | str]] = []
            fake_scores: list[float] = []
            for index in indices:
                capture.set(cv2.CAP_PROP_POS_FRAMES, int(index))
                ok, frame = capture.read()
                if not ok or frame is None:
                    continue
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                real_probability, fake_probability = self._predict(Image.fromarray(rgb))
                fake_scores.append(fake_probability)
                frame_results.append(
                    {
                        "frame_index": int(index),
                        "timestamp_seconds": round(int(index) / fps, 3),
                        "fake_probability": round(fake_probability, 6),
                        "verdict": (
                            "likely_fake"
                            if fake_probability >= 0.65
                            else "likely_real"
                            if fake_probability <= 0.35
                            else "uncertain"
                        ),
                    }
                )
            if len(fake_scores) < min(3, sample_count):
                raise ValueError("Không đọc được đủ frame để đưa ra kết quả")

            suspicious_frames = sum(score >= 0.65 for score in fake_scores)
            # A high percentile preserves isolated suspicious edits better than
            # a plain mean, while the median limits one corrupted-frame spike.
            aggregate_fake = float(
                0.65 * np.percentile(fake_scores, 75) + 0.35 * np.median(fake_scores)
            )
            aggregate_real = 1.0 - aggregate_fake
            if aggregate_fake >= 0.65 or suspicious_frames >= max(2, len(fake_scores) // 3):
                verdict, decision = "likely_fake", "WARN"
            elif aggregate_fake <= 0.35 and suspicious_frames == 0:
                verdict, decision = "likely_real", "ALLOW"
            else:
                verdict, decision = "uncertain", "REVIEW"

            evidence = [
                f"Đã lấy mẫu {len(fake_scores)} frame trên {duration:.1f} giây",
                f"{suspicious_frames}/{len(fake_scores)} frame có xác suất FAKE từ 65%",
                f"Điểm video tổng hợp từ percentile 75 và median: FAKE {aggregate_fake:.1%}",
            ]
            return DeepfakeVideoResult(
                duration_seconds=round(duration, 3),
                width=width,
                height=height,
                sampled_frames=len(fake_scores),
                suspicious_frames=suspicious_frames,
                real_probability=round(aggregate_real, 6),
                fake_probability=round(aggregate_fake, 6),
                verdict=verdict,
                decision=decision,
                analysis_time_ms=round((time.perf_counter() - started) * 1000),
                evidence=evidence,
                frame_results=frame_results,
            )
        finally:
            if capture is not None:
                capture.release()
            if temp_path:
                try:
                    os.unlink(temp_path)
                except OSError:
                    pass
            self._video_slots.release()
