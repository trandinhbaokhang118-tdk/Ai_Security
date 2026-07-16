"""Download & normalize real datasets for AI Security Armor (dataset-plan.md §2-4).

Produces the exact formats the training scripts consume:
    - URL model  (train_url_lgbm.py):        url,label      -> data/url_dataset.csv
    - Text model (train_text_transformer.py): text,label     -> data/phishing_text_*.csv
    - Prompt model:                           text,label     -> data/prompt_injection_*.csv

Design principles (from dataset-plan.md):
    - License-safe HuggingFace sources (Apache/MIT/CC0/ODbL).
    - Reproducible splits with seed=42, stratified by label.
    - Each modality is independent: one source failing does NOT abort the others.
    - Writes a DATA_CARD-style .meta.json per dataset (source, rows, class balance).

Usage:
    python data/download_dataset.py --all
    python data/download_dataset.py --url --text --prompt
    python data/download_dataset.py --prompt --max-rows 5000     # quick subset

Requires: pip install datasets pandas scikit-learn
"""

from __future__ import annotations

import argparse
import json
import os
import sys

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
SEED = 42


# --------------------------------------------------------------------------- utils
def _log(msg: str) -> None:
    print(f"[download] {msg}", flush=True)


def _write_meta(name: str, meta: dict) -> None:
    path = os.path.join(DATA_DIR, f"{name}.meta.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(meta, fh, ensure_ascii=False, indent=2)
    _log(f"wrote {path}")


def _split_and_save(df, prefix: str, source: str, text_col: str = "text") -> dict:
    """Stratified 80/10/10 split -> {prefix}_{train,validation,test}.csv + meta."""
    import pandas as pd  # noqa: F401
    from sklearn.model_selection import train_test_split

    df = df.dropna(subset=[text_col, "label"]).drop_duplicates(subset=[text_col])
    df["label"] = df["label"].astype(int)

    train, temp = train_test_split(
        df, test_size=0.2, random_state=SEED, stratify=df["label"]
    )
    val, test = train_test_split(
        temp, test_size=0.5, random_state=SEED, stratify=temp["label"]
    )

    counts = {}
    for split_name, part in (("train", train), ("validation", val), ("test", test)):
        out = os.path.join(DATA_DIR, f"{prefix}_{split_name}.csv")
        part.to_csv(out, index=False, encoding="utf-8")
        counts[f"{prefix}_{split_name}.csv"] = {
            "rows": int(len(part)),
            "class_counts": {str(k): int(v) for k, v in part["label"].value_counts().items()},
        }
        _log(f"saved {out} ({len(part)} rows)")

    meta = {
        "source": source,
        "seed": SEED,
        "total_rows": int(len(df)),
        "class_counts": {str(k): int(v) for k, v in df["label"].value_counts().items()},
        "label_mapping": {"0": "benign", "1": "malicious"},
        "splits": counts,
    }
    _write_meta(prefix + "_dataset", meta)
    return meta


# ------------------------------------------------------------------------ URL model
def download_url(max_rows: int | None) -> None:
    """URL phishing dataset -> data/url_dataset.csv (url,label).

    Primary source: `pirocheto/phishing-url` (CC0-style, url + status label).
    Fallback: `ealvaradob/phishing-dataset` config `urls`.
    """
    import pandas as pd
    from datasets import load_dataset

    _log("URL: loading pirocheto/phishing-url ...")
    df = None
    try:
        ds = load_dataset("pirocheto/phishing-url")
        frames = [ds[s].to_pandas() for s in ds]
        raw = pd.concat(frames, ignore_index=True)
        # status: "phishing"/"legitimate" -> 1/0 ; url column present
        url_col = "url" if "url" in raw.columns else raw.columns[0]
        label_col = "status" if "status" in raw.columns else "label"
        raw = raw.rename(columns={url_col: "url"})
        raw["label"] = raw[label_col].map(
            lambda v: 1 if str(v).lower() in ("phishing", "1", "malicious", "bad") else 0
        )
        df = raw[["url", "label"]]
    except Exception as exc:  # noqa: BLE001
        _log(f"URL: primary source failed ({exc}); trying ealvaradob/phishing-dataset[urls]")
        try:
            ds = load_dataset("ealvaradob/phishing-dataset", "urls",
                              trust_remote_code=True)
            raw = ds["train"].to_pandas()
            text_col = "text" if "text" in raw.columns else raw.columns[0]
            raw = raw.rename(columns={text_col: "url"})
            df = raw[["url", "label"]]
        except Exception as exc2:  # noqa: BLE001
            _log(f"URL: FAILED both sources: {exc2}")
            return

    df = df.dropna().drop_duplicates(subset=["url"])
    df["label"] = df["label"].astype(int)
    if max_rows:
        df = df.groupby("label", group_keys=False).apply(
            lambda g: g.sample(min(len(g), max_rows // 2), random_state=SEED)
        )
    out = os.path.join(DATA_DIR, "url_dataset.csv")
    df.to_csv(out, index=False, encoding="utf-8")
    _log(f"URL: saved {out} ({len(df)} rows)")
    _write_meta("url_dataset", {
        "source": "pirocheto/phishing-url (fallback ealvaradob/phishing-dataset[urls])",
        "total_rows": int(len(df)),
        "class_counts": {str(k): int(v) for k, v in df["label"].value_counts().items()},
        "format": "url,label (1=phishing,0=benign)",
    })


# ----------------------------------------------------------------------- text model
def download_text(max_rows: int | None) -> None:
    """Email/text phishing -> data/phishing_text_{train,validation,test}.csv.

    Source: ealvaradob/phishing-dataset config `texts` (~20k, EN emails/SMS).
    (VI augmentation is handled separately by generate_synthetic_vi.py.)
    """
    from datasets import load_dataset

    _log("TEXT: loading ealvaradob/phishing-dataset[texts] ...")
    try:
        ds = load_dataset("ealvaradob/phishing-dataset", "texts", trust_remote_code=True)
        raw = ds["train"].to_pandas()
    except Exception as exc:  # noqa: BLE001
        _log(f"TEXT: FAILED: {exc}")
        return
    text_col = "text" if "text" in raw.columns else raw.columns[0]
    raw = raw.rename(columns={text_col: "text"})[["text", "label"]]
    if max_rows:
        raw = raw.groupby("label", group_keys=False).apply(
            lambda g: g.sample(min(len(g), max_rows // 2), random_state=SEED)
        )
    _split_and_save(raw, "phishing_text", "ealvaradob/phishing-dataset[texts]")


# --------------------------------------------------------------------- prompt model
def download_prompt(max_rows: int | None) -> None:
    """Prompt injection -> data/prompt_injection_{train,validation,test}.csv.

    Primary: xTRam1/safe-guard-prompt-injection (Apache 2.0, ~10k).
    Fallback: deepset/prompt-injections (Apache 2.0, ~600).
    """
    import pandas as pd
    from datasets import load_dataset

    _log("PROMPT: loading xTRam1/safe-guard-prompt-injection ...")
    frames = []
    try:
        ds = load_dataset("xTRam1/safe-guard-prompt-injection")
        for s in ds:
            frames.append(ds[s].to_pandas())
    except Exception as exc:  # noqa: BLE001
        _log(f"PROMPT: primary failed ({exc}); trying deepset/prompt-injections")
        try:
            ds = load_dataset("deepset/prompt-injections")
            for s in ds:
                frames.append(ds[s].to_pandas())
        except Exception as exc2:  # noqa: BLE001
            _log(f"PROMPT: FAILED both sources: {exc2}")
            return

    raw = pd.concat(frames, ignore_index=True)
    text_col = "text" if "text" in raw.columns else raw.columns[0]
    label_col = "label" if "label" in raw.columns else raw.columns[-1]
    raw = raw.rename(columns={text_col: "text", label_col: "label"})[["text", "label"]]
    if max_rows:
        raw = raw.groupby("label", group_keys=False).apply(
            lambda g: g.sample(min(len(g), max_rows // 2), random_state=SEED)
        )
    _split_and_save(raw, "prompt_injection", "xTRam1/safe-guard-prompt-injection")


# ---------------------------------------------------------------------------- main
def main() -> None:
    parser = argparse.ArgumentParser(description="Download real datasets (dataset-plan.md).")
    parser.add_argument("--all", action="store_true", help="Download all 3 modalities")
    parser.add_argument("--url", action="store_true")
    parser.add_argument("--text", action="store_true")
    parser.add_argument("--prompt", action="store_true")
    parser.add_argument("--max-rows", type=int, default=None,
                        help="Cap rows per dataset (balanced) for quick runs")
    args = parser.parse_args()

    do_url = args.all or args.url
    do_text = args.all or args.text
    do_prompt = args.all or args.prompt
    if not (do_url or do_text or do_prompt):
        parser.print_help()
        sys.exit(1)

    if do_url:
        download_url(args.max_rows)
    if do_text:
        download_text(args.max_rows)
    if do_prompt:
        download_prompt(args.max_rows)
    _log("DONE.")


if __name__ == "__main__":
    main()
