"""Process runner for the advanced headless browser URL sandbox."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

from shared.schemas import BrowserSandboxURLResponse


class BrowserSandboxRunner:
    def __init__(
        self,
        process_timeout_seconds: float = 35.0,
        navigation_timeout_ms: int = 15_000,
    ) -> None:
        self.process_timeout_seconds = process_timeout_seconds
        self.navigation_timeout_ms = navigation_timeout_ms
        self.worker_path = Path(__file__).with_name("browser_sandbox_worker.py")

    def inspect(self, url: str, canary_mode: str = "dry_run") -> BrowserSandboxURLResponse:
        payload = json.dumps(
            {
                "url": url,
                "canary_mode": canary_mode,
                "timeout_ms": self.navigation_timeout_ms,
            },
            ensure_ascii=False,
        )
        creationflags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
        worker_env = {"PYTHONIOENCODING": "utf-8"}
        keep_env = (
            "SYSTEMROOT",
            "WINDIR",
            "COMSPEC",
            "PATH",
            "PATHEXT",
            "PROGRAMFILES",
            "PROGRAMFILES(X86)",
            "LOCALAPPDATA",
            "APPDATA",
            "USERPROFILE",
            "TEMP",
            "TMP",
            "LANG",
            "SSL_CERT_FILE",
            "SSL_CERT_DIR",
            "BRAND_VISUAL_HASH_REGISTRY",
        )
        for name in keep_env:
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
            return BrowserSandboxURLResponse.failed(
                url,
                "browser_sandbox_timeout",
                "Browser sandbox stopped the process because it exceeded the time limit.",
                f"Limit {self.process_timeout_seconds:g} seconds",
            )

        if completed.returncode != 0:
            return BrowserSandboxURLResponse.failed(
                url,
                "browser_sandbox_process_error",
                "Browser sandbox process exited unexpectedly.",
                completed.stderr[-800:],
            )
        try:
            return BrowserSandboxURLResponse.model_validate_json(completed.stdout)
        except ValueError as exc:
            return BrowserSandboxURLResponse.failed(
                url,
                "browser_sandbox_invalid_output",
                "Browser sandbox returned invalid data.",
                str(exc),
            )
