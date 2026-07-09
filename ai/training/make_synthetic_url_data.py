"""Generate a synthetic labeled URL dataset for smoke-training the pipeline.

NOT a substitute for real data (PhishTank/Tranco) — it exists so the training→ONNX→
serving path can be exercised end-to-end without downloading external corpora.

Usage: python -m ai.training.make_synthetic_url_data --out data/url_dataset.csv --n 4000
"""

from __future__ import annotations

import argparse
import csv
import os
import random

BENIGN_HOSTS = [
    "github.com", "google.com", "wikipedia.org", "stackoverflow.com", "python.org",
    "nytimes.com", "vnexpress.net", "vietcombank.com.vn", "shopee.vn", "tiki.vn",
    "microsoft.com", "apple.com", "amazon.com", "cloudflare.com", "mozilla.org",
]
BENIGN_PATHS = ["", "/", "/about", "/docs/guide", "/user/repo", "/search?q=test", "/news/2024"]

PHISH_BRANDS = ["paypa1", "vietc0mbank", "faceb00k", "g00gle", "app1e", "micr0soft", "amaz0n"]
PHISH_TLDS = ["xyz", "tk", "top", "gq", "ml", "cf", "click", "loan"]
PHISH_PATHS = ["/login", "/verify", "/secure/account", "/update-password", "/confirm?id=1"]


def gen_benign(rng: random.Random) -> str:
    host = rng.choice(BENIGN_HOSTS)
    scheme = "https" if rng.random() < 0.95 else "http"
    return f"{scheme}://{host}{rng.choice(BENIGN_PATHS)}"


def gen_phish(rng: random.Random) -> str:
    brand = rng.choice(PHISH_BRANDS)
    suffix = rng.choice(["-secure", "-verify", "-login", "-account", ""])
    tld = rng.choice(PHISH_TLDS)
    scheme = "http" if rng.random() < 0.8 else "https"
    if rng.random() < 0.15:
        host = f"{rng.randint(1,255)}.{rng.randint(0,255)}.{rng.randint(0,255)}.{rng.randint(1,255)}"
    else:
        host = f"{brand}{suffix}.{tld}"
    return f"{scheme}://{host}{rng.choice(PHISH_PATHS)}"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="data/url_dataset.csv")
    parser.add_argument("--n", type=int, default=4000)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    with open(args.out, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["url", "label"])
        for _ in range(args.n // 2):
            w.writerow([gen_benign(rng), 0])
            w.writerow([gen_phish(rng), 1])
    print(f"Wrote {args.n} rows to {args.out}")


if __name__ == "__main__":
    main()
