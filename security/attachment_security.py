"""Bounded local security services for email attachments.

Files are streamed to a private ClamAV daemon and images are passed to a local
Tesseract process. Neither operation executes the attachment or sends it to an
external provider.
"""
from __future__ import annotations

import shutil
import socket
import struct
import subprocess
import tempfile
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

from PIL import Image, UnidentifiedImageError


@dataclass(frozen=True)
class MalwareScanResult:
    status: str
    malicious: bool = False
    signature: str = ""
    detail: str = ""


@dataclass(frozen=True)
class OCRResult:
    status: str
    text: str = ""
    detail: str = ""


def clamav_ready(host: str, port: int = 3310, timeout_seconds: float = 1.5) -> bool:
    if not host:
        return False
    try:
        with socket.create_connection(
            (host, int(port)), timeout=max(0.25, min(float(timeout_seconds), 3.0))
        ) as connection:
            connection.settimeout(max(0.25, min(float(timeout_seconds), 3.0)))
            connection.sendall(b"zPING\0")
            return connection.recv(16).split(b"\0", 1)[0] == b"PONG"
    except (OSError, TimeoutError, ValueError):
        return False


def scan_clamav_bytes(
    data: bytes,
    *,
    host: str,
    port: int = 3310,
    timeout_seconds: float = 8.0,
    max_bytes: int = 10 * 1024 * 1024,
) -> MalwareScanResult:
    """Scan bytes over clamd INSTREAM without sharing a host filesystem path."""

    if not host:
        return MalwareScanResult("unavailable", detail="ClamAV chưa được cấu hình.")
    if not data:
        return MalwareScanResult("completed")
    if len(data) > max_bytes:
        return MalwareScanResult("unavailable", detail="Tệp vượt giới hạn quét ClamAV.")

    try:
        with socket.create_connection(
            (host, int(port)), timeout=max(0.5, min(float(timeout_seconds), 30.0))
        ) as connection:
            connection.settimeout(max(0.5, min(float(timeout_seconds), 30.0)))
            connection.sendall(b"zINSTREAM\0")
            for offset in range(0, len(data), 64 * 1024):
                chunk = data[offset : offset + 64 * 1024]
                connection.sendall(struct.pack("!I", len(chunk)) + chunk)
            connection.sendall(struct.pack("!I", 0))
            reply = bytearray()
            while len(reply) < 4096:
                block = connection.recv(1024)
                if not block:
                    break
                reply.extend(block)
                if b"\0" in block:
                    break
    except (OSError, TimeoutError, ValueError) as exc:
        return MalwareScanResult(
            "unavailable", detail=f"ClamAV không phản hồi: {type(exc).__name__}."
        )

    message = bytes(reply).split(b"\0", 1)[0].decode("utf-8", errors="replace").strip()
    if message.endswith(" OK"):
        return MalwareScanResult("completed")
    if message.endswith(" FOUND"):
        signature = message.rsplit(": ", 1)[-1].removesuffix(" FOUND").strip()
        return MalwareScanResult("completed", malicious=True, signature=signature)
    return MalwareScanResult("unavailable", detail=(message or "Phản hồi ClamAV không hợp lệ.")[:500])


def ocr_image_bytes(
    data: bytes,
    *,
    executable: str = "",
    languages: str = "vie+eng",
    timeout_seconds: float = 12.0,
    max_pixels: int = 20_000_000,
) -> OCRResult:
    """Extract bounded text with the local Tesseract CLI."""

    command = executable.strip() or shutil.which("tesseract") or ""
    if not command:
        return OCRResult("unavailable", detail="Tesseract chưa được cài đặt.")

    try:
        with Image.open(BytesIO(data)) as image:
            width, height = image.size
            if width <= 0 or height <= 0 or width * height > max_pixels:
                return OCRResult("unavailable", detail="Ảnh vượt giới hạn điểm ảnh OCR.")
            image.verify()
            suffix = ".png" if image.format == "PNG" else ".jpg"
    except (UnidentifiedImageError, OSError, ValueError):
        return OCRResult("unavailable", detail="Dữ liệu ảnh không hợp lệ.")

    with tempfile.TemporaryDirectory(prefix="aisec-ocr-") as root:
        image_path = Path(root) / f"input{suffix}"
        image_path.write_bytes(data)
        base = [command, str(image_path), "stdout", "--oem", "1", "--psm", "6"]
        requested = [item for item in languages.replace(",", "+").split("+") if item]
        language_attempts = ["+".join(requested)] if requested else ["eng"]
        if "eng" not in language_attempts:
            language_attempts.append("eng")
        last_error = ""
        for language in language_attempts:
            try:
                completed = subprocess.run(
                    [*base, "-l", language],
                    capture_output=True,
                    check=False,
                    timeout=max(1.0, min(float(timeout_seconds), 30.0)),
                    creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
                )
            except (OSError, subprocess.TimeoutExpired) as exc:
                return OCRResult(
                    "unavailable", detail=f"OCR không chạy được: {type(exc).__name__}."
                )
            if completed.returncode == 0:
                text = completed.stdout.decode("utf-8", errors="replace").strip()
                return OCRResult("completed", text=text[:50_000])
            last_error = completed.stderr.decode("utf-8", errors="replace").strip()
        return OCRResult("unavailable", detail=(last_error or "Tesseract báo lỗi.")[:500])
