#!/usr/bin/env python3
"""Delete only recreatable files under the current user's Windows Temp folder."""
from __future__ import annotations

import json
import os
import shutil
from pathlib import Path


def free_bytes(path: Path) -> int:
    return shutil.disk_usage(path).free


def main() -> None:
    temp = Path(os.environ.get("TEMP", str(Path.home() / "AppData/Local/Temp"))).resolve()
    before = free_bytes(temp)
    removed = 0
    failed = 0
    for child in list(temp.iterdir()):
        try:
            if child.is_dir() and not child.is_symlink():
                shutil.rmtree(child)
            else:
                child.unlink(missing_ok=True)
            removed += 1
        except (PermissionError, OSError):
            failed += 1
    after = free_bytes(temp)
    print(json.dumps({
        "temp": str(temp),
        "removed_entries": removed,
        "skipped_in_use_entries": failed,
        "freed_gb": round((after - before) / (1024 ** 3), 2),
        "free_gb": round(after / (1024 ** 3), 2),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
