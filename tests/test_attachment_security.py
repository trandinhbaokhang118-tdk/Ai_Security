from __future__ import annotations

import io
import subprocess

from PIL import Image

from security import attachment_security


class _FakeClamdSocket:
    def __init__(self, reply: bytes) -> None:
        self.reply = reply
        self.sent = bytearray()

    def __enter__(self):
        return self

    def __exit__(self, *_args) -> None:
        return None

    def settimeout(self, _timeout: float) -> None:
        return None

    def sendall(self, data: bytes) -> None:
        self.sent.extend(data)

    def recv(self, _size: int) -> bytes:
        reply, self.reply = self.reply, b""
        return reply


def test_clamav_instream_detects_signature(monkeypatch) -> None:
    connection = _FakeClamdSocket(b"stream: Win.Test.EICAR_HDB-1 FOUND\0")
    monkeypatch.setattr(
        attachment_security.socket,
        "create_connection",
        lambda *_args, **_kwargs: connection,
    )

    result = attachment_security.scan_clamav_bytes(b"test", host="clamav")

    assert result.status == "completed"
    assert result.malicious is True
    assert result.signature == "Win.Test.EICAR_HDB-1"
    assert connection.sent.startswith(b"zINSTREAM\0")
    assert connection.sent.endswith(b"\0\0\0\0")


def test_ocr_uses_bounded_local_tesseract(monkeypatch) -> None:
    image_bytes = io.BytesIO()
    Image.new("RGB", (40, 20), color="white").save(image_bytes, format="PNG")
    monkeypatch.setattr(attachment_security.shutil, "which", lambda _name: "tesseract")
    monkeypatch.setattr(
        attachment_security.subprocess,
        "run",
        lambda *_args, **_kwargs: subprocess.CompletedProcess(
            args=[], returncode=0, stdout="Xác minh tại https://evil.test".encode(), stderr=b""
        ),
    )

    result = attachment_security.ocr_image_bytes(image_bytes.getvalue())

    assert result.status == "completed"
    assert "https://evil.test" in result.text
