"""Load the cloned Phishing.Database active URL feed into backend storage."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.config import settings  # noqa: E402
from backend.db import initialize_database  # noqa: E402
from backend.services.threat_feed_service import import_phishing_database  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Import current active URLs from a local Phishing.Database clone."
    )
    parser.add_argument(
        "--repository",
        default=settings.threat_feed_phishing_database_path,
        help="Path to the cloned Phishing.Database repository.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=settings.threat_feed_max_records_per_source,
        help="Maximum active URLs to import.",
    )
    args = parser.parse_args()

    initialize_database()
    result = import_phishing_database(args.repository, limit=args.limit)
    print(
        f"source={result.source} status={result.status} "
        f"seen={result.records_seen} upserted={result.records_upserted}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
