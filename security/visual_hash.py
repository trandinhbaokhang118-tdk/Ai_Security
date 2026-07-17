"""Privacy-preserving screenshot hashing and curated brand reference comparison."""
from __future__ import annotations

import hashlib
import io
import json
from pathlib import Path
from typing import Any

from PIL import Image

DEFAULT_REGISTRY = Path(__file__).resolve().parents[1] / "data" / "brand_visual_hashes.json"


def dhash64(image_bytes: bytes) -> tuple[str, int, int]:
    """Return a 64-bit difference hash and original image dimensions."""
    with Image.open(io.BytesIO(image_bytes)) as image:
        width, height = image.size
        grayscale = image.convert("L").resize((9, 8), Image.Resampling.LANCZOS)
        pixels = list(grayscale.get_flattened_data())
    value = 0
    for row in range(8):
        for column in range(8):
            left = pixels[row * 9 + column]
            right = pixels[row * 9 + column + 1]
            value = (value << 1) | int(left > right)
    return f"{value:016x}", width, height


def hash_similarity(left: str, right: str) -> float:
    if len(left) != 16 or len(right) != 16:
        return 0.0
    try:
        distance = (int(left, 16) ^ int(right, 16)).bit_count()
    except ValueError:
        return 0.0
    return round(1.0 - distance / 64.0, 6)


def _official_host(host: str, domains: list[str]) -> bool:
    normalized = host.lower().rstrip(".")
    return any(normalized == domain or normalized.endswith("." + domain) for domain in domains)


def load_registry(path: str | Path | None = None) -> dict[str, Any]:
    registry_path = Path(path) if path else DEFAULT_REGISTRY
    try:
        value = json.loads(registry_path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {"version": 1, "brands": []}
    return value if isinstance(value, dict) else {"version": 1, "brands": []}


def analyze_visual_hash(
    screenshot: bytes,
    *,
    host: str,
    title: str = "",
    registry_path: str | Path | None = None,
) -> dict[str, Any]:
    """Compare a screenshot hash with locally curated official brand references."""
    image_hash, width, height = dhash64(screenshot)
    registry = load_registry(registry_path)
    title_lower = title.lower()
    best: dict[str, Any] | None = None
    references_checked = 0
    for entry in registry.get("brands", []):
        if not isinstance(entry, dict):
            continue
        brand = str(entry.get("brand") or "").lower().strip()
        domains = [str(item).lower().strip() for item in entry.get("allowed_domains", []) if item]
        hashes = [str(item).lower().strip() for item in entry.get("hashes", []) if item]
        if not brand or not hashes:
            continue
        references_checked += len(hashes)
        similarity = max(hash_similarity(image_hash, reference) for reference in hashes)
        candidate = {
            "brand": brand,
            "similarity": similarity,
            "official_domain": _official_host(host, domains),
            "title_mentions_brand": brand in title_lower,
        }
        if best is None or similarity > best["similarity"]:
            best = candidate

    threshold = float(registry.get("match_threshold", 0.88))
    matched = best is not None and best["similarity"] >= threshold
    brand_mismatch = bool(matched and not best["official_domain"])
    return {
        "status": "matched" if matched else "no_match" if references_checked else "no_reference",
        "algorithm": "dhash64",
        "screenshot_sha256": hashlib.sha256(screenshot).hexdigest(),
        "dhash64": image_hash,
        "width": width,
        "height": height,
        "registry_version": registry.get("version", 1),
        "references_checked": references_checked,
        "matched_brand": best["brand"] if matched and best else "",
        "similarity": best["similarity"] if matched and best else 0.0,
        "brand_mismatch": brand_mismatch,
        "threshold": threshold,
        "raw_screenshot_stored": False,
    }
