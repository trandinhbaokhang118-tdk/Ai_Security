"""Print optional integration readiness without exposing configured secrets."""

# ruff: noqa: E402 -- repository root must be importable for direct script execution.

from __future__ import annotations

import json
import sys
from pathlib import Path

# Running ``python scripts/check_integrations.py`` places only ``scripts`` on
# sys.path. Add the repository root so this documented command works without
# requiring callers to set PYTHONPATH first.
REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
if str(REPOSITORY_ROOT) not in sys.path:
    sys.path.insert(0, str(REPOSITORY_ROOT))

from backend.config import settings
from backend.services.cloud_sandbox_service import cloud_sandbox_service
from backend.services.integration_status_service import integration_status
from security.attachment_security import clamav_ready


def main() -> None:
    status = integration_status(
        settings,
        clamav_is_ready=clamav_ready(settings.clamav_host, settings.clamav_port),
        cloud_sandbox_is_configured=cloud_sandbox_service.configured(),
    )
    print(json.dumps(status, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
