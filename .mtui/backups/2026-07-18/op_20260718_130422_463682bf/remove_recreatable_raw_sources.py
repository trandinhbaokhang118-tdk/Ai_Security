#!/usr/bin/env python3
"""Remove only allow-listed downloaded raw corpora that can be fetched again."""
from __future__ import annotations

import json
import shutil
from pathlib import Path

ALLOWLIST = (
    Path(r"C:\NDT\PJ\prewise-datasets\sources\webs_30k\webs.json"),
    Path(r"C:\NDT\PJ\prewise-datasets\sources\email_365k\df.csv"),
)


def main() -> None:
    before = shutil.disk_usage(r"C:\").free
    removed = []
    for path in ALLOWLIST:
        if path.is_file():
            size = path.stat().st_size
            path.unlink()
            removed.append({"path": str(path), "bytes": size})
    after = shutil.disk_usage(r"C:\").free
    print(json.dumps({
        "removed": removed,
        "freed_gb": round((after - before) / (1024 ** 3), 2),
        "free_gb": round(after / (1024 ** 3), 2),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
