"""Local ONNX screening for AI-generated or manipulated still images."""

from __future__ import annotations

import io
import threading
import time
from dataclasses import dataclass
from pathlib import Path

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


class DeepfakeImageService:
    """Lazy, thread-safe wrapper around the quantized ViT ONNX model."""

    model_version = "capcheck-ai-image-detection-vit-q4"

    def __init__(self, model_path: str) -> None:
        self.model_path = Path(model_path)
        self._session: ort.InferenceSession | None = None
        self._lock = threading.Lock()

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

        pixels = np.asarray(image, dtype=np.float32) / 255.0
        pixels = (pixels - 0.5) / 0.5
        tensor = np.transpose(pixels, (2, 0, 1))[None, ...]
        logits = self._get_session().run(["logits"], {"pixel_values": tensor})[0][0]
        shifted = logits - np.max(logits)
        probabilities = np.exp(shifted) / np.exp(shifted).sum()
        real_probability = float(probabilities[0])
        fake_probability = float(probabilities[1])

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
