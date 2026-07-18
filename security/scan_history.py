"""Small local history store for DNS and rendered-content change detection.

The project is intentionally portable and does not require a database.  This
store keeps only bounded fingerprints in ``.aisec-data``; it never stores page
HTML, screenshots, query strings, or user-submitted form values.
"""

from __future__ import annotations

import json
import os
import threading
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

_LOCK = threading.Lock()


@dataclass(frozen=True)
class HistoryComparison:
    dns_observations: int = 0
    dns_distinct_snapshots: int = 0
    dns_changed: bool | None = None
    content_observations: int = 0
    content_changed: bool | None = None
    title_changed: bool | None = None
    previous_title: str = ""


class LocalScanHistory:
    """Persist a bounded, privacy-preserving history for each domain."""

    def __init__(self, path: str | Path | None = None, max_domains: int = 500) -> None:
        configured = path or os.environ.get("AISEC_SCAN_HISTORY_PATH")
        self.path = Path(configured or ".aisec-data/url-scan-history.json")
        self.max_domains = max(10, max_domains)

    def observe(self, domain: str, snapshot: dict[str, Any]) -> HistoryComparison:
        domain = domain.lower().strip().rstrip(".")
        if not domain:
            return HistoryComparison()
        current = self._normalize_snapshot(snapshot)
        with _LOCK:
            data = self._read()
            domains = data.setdefault("domains", {})
            previous = list(domains.get(domain, []))[-5:]
            comparison = self._compare(previous, current)
            domains[domain] = [*previous, current][-6:]
            if len(domains) > self.max_domains:
                oldest = sorted(
                    domains,
                    key=lambda key: str((domains[key] or [{}])[-1].get("observed_at", "")),
                )[: len(domains) - self.max_domains]
                for key in oldest:
                    domains.pop(key, None)
            data["version"] = 1
            self._write(data)
        return comparison

    @staticmethod
    def _normalize_snapshot(snapshot: dict[str, Any]) -> dict[str, Any]:
        dns = snapshot.get("dns") if isinstance(snapshot.get("dns"), dict) else {}
        content = snapshot.get("content") if isinstance(snapshot.get("content"), dict) else {}
        return {
            "observed_at": datetime.now(UTC).isoformat(),
            "dns": {
                "addresses": sorted({str(item) for item in dns.get("addresses", []) if item}),
                "nameservers": sorted(
                    {str(item).lower().rstrip(".") for item in dns.get("nameservers", []) if item}
                ),
                "mx": sorted({str(item).lower().rstrip(".") for item in dns.get("mx", []) if item}),
            },
            "content": {
                "fingerprint": str(content.get("fingerprint") or ""),
                "title": " ".join(str(content.get("title") or "").split())[:200],
                "site_name": " ".join(str(content.get("site_name") or "").split())[:160],
                "visual_hash": str(content.get("visual_hash") or "")[:32],
            },
        }

    @staticmethod
    def _compare(previous: list[dict[str, Any]], current: dict[str, Any]) -> HistoryComparison:
        current_dns = current.get("dns") or {}
        dns_rows = [row.get("dns") or {} for row in previous if row.get("dns")]
        current_dns_key = json.dumps(current_dns, ensure_ascii=True, sort_keys=True)
        dns_keys = [json.dumps(row, ensure_ascii=True, sort_keys=True) for row in dns_rows]
        dns_changed = None if not dns_keys else dns_keys[-1] != current_dns_key

        current_content = current.get("content") or {}
        has_content = bool(
            current_content.get("fingerprint")
            or current_content.get("title")
            or current_content.get("visual_hash")
        )
        content_rows = [
            row.get("content") or {}
            for row in previous
            if (row.get("content") or {}).get("fingerprint")
            or (row.get("content") or {}).get("title")
            or (row.get("content") or {}).get("visual_hash")
        ]
        previous_content = content_rows[-1] if content_rows else {}
        content_changed = None
        title_changed = None
        if has_content and previous_content:
            current_fingerprint = str(current_content.get("fingerprint") or "")
            previous_fingerprint = str(previous_content.get("fingerprint") or "")
            content_changed = bool(
                current_fingerprint
                and previous_fingerprint
                and current_fingerprint != previous_fingerprint
            )
            current_title = str(current_content.get("title") or "").casefold()
            previous_title = str(previous_content.get("title") or "").casefold()
            title_changed = bool(current_title and previous_title and current_title != previous_title)

        return HistoryComparison(
            dns_observations=len(dns_rows) + 1,
            dns_distinct_snapshots=len(set([*dns_keys, current_dns_key])),
            dns_changed=dns_changed,
            content_observations=len(content_rows) + int(has_content),
            content_changed=content_changed,
            title_changed=title_changed,
            previous_title=str(previous_content.get("title") or ""),
        )

    def _read(self) -> dict[str, Any]:
        try:
            value = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return {"version": 1, "domains": {}}
        return value if isinstance(value, dict) else {"version": 1, "domains": {}}

    def _write(self, data: dict[str, Any]) -> None:
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            temporary = self.path.with_suffix(self.path.suffix + ".tmp")
            temporary.write_text(
                json.dumps(data, ensure_ascii=False, separators=(",", ":")),
                encoding="utf-8",
            )
            os.replace(temporary, self.path)
        except OSError:
            # History enrichment must never make the primary scan fail.
            return


local_scan_history = LocalScanHistory()
