"""Create a curated dHash entry from an analyst-approved official screenshot."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from security.visual_hash import dhash64, load_registry


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--brand", required=True)
    parser.add_argument("--domain", required=True)
    parser.add_argument("--image", required=True, type=Path)
    parser.add_argument("--registry", default=Path("data/brand_visual_hashes.json"), type=Path)
    args = parser.parse_args()

    registry = load_registry(args.registry)
    image_hash, _, _ = dhash64(args.image.read_bytes())
    brands = registry.setdefault("brands", [])
    entry = next(
        (item for item in brands if str(item.get("brand", "")).lower() == args.brand.lower()),
        None,
    )
    if entry is None:
        entry = {"brand": args.brand.lower(), "allowed_domains": [], "hashes": []}
        brands.append(entry)
    if args.domain.lower() not in entry["allowed_domains"]:
        entry["allowed_domains"].append(args.domain.lower())
    if image_hash not in entry["hashes"]:
        entry["hashes"].append(image_hash)
    args.registry.parent.mkdir(parents=True, exist_ok=True)
    args.registry.write_text(json.dumps(registry, indent=2) + "\n", encoding="utf-8")
    print(image_hash)


if __name__ == "__main__":
    main()
