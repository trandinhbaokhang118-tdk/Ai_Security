"""Process-isolated runner for live URL inspection."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

from shared.schemas import SandboxURLResponse


class URLSandboxRunner:
    def __init__(
        self,
        process_timeout_seconds: float = 15.0,
        request_timeout_seconds: float = 5.0,
        max_bytes: int = 1_048_576,
        max_redirects: int = 5,
    ) -> None:
        self.process_timeout_seconds = process_timeout_seconds
        self.request_timeout_seconds = request_timeout_seconds
        self.max_bytes = max_bytes
        self.max_redirects = max_redirects
        self.worker_path = Path(__file__).with_name("sandbox_worker.py")

    def inspect(self, url: str) -> SandboxURLResponse:
        payload = json.dumps(
            {
                "url": url,
                "timeout_seconds": self.request_timeout_seconds,
                "max_bytes": self.max_bytes,
                "max_redirects": self.max_redirects,
            },
            ensure_ascii=False,
        )
        creationflags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
        worker_env = {"PYTHONIOENCODING": "utf-8"}
        for name in ("SYSTEMROOT", "WINDIR", "COMSPEC", "LANG", "SSL_CERT_FILE", "SSL_CERT_DIR"):
            if value := os.environ.get(name):
                worker_env[name] = value
        try:
            completed = subprocess.run(
                [sys.executable, "-I", str(self.worker_path)],
                input=payload,
                text=True,
                encoding="utf-8",
                capture_output=True,
                timeout=self.process_timeout_seconds,
                check=False,
                cwd=str(self.worker_path.parent),
                env=worker_env,
                creationflags=creationflags,
                start_new_session=os.name != "nt",
            )
        except subprocess.TimeoutExpired:
            return SandboxURLResponse.failed(
                url,
                "sandbox_timeout",
                "Sandbox đã dừng tiến trình vì vượt quá thời gian thực thi.",
                f"Giới hạn {self.process_timeout_seconds:g} giây",
            )

        if completed.returncode != 0:
            return SandboxURLResponse.failed(
                url,
                "sandbox_process_error",
                "Tiến trình sandbox kết thúc bất thường.",
                completed.stderr[-500:],
            )
        try:
            return SandboxURLResponse.model_validate_json(completed.stdout)
        except ValueError as exc:
            return SandboxURLResponse.failed(
                url,
                "sandbox_invalid_output",
                "Sandbox trả về dữ liệu không hợp lệ.",
                str(exc),
            )
