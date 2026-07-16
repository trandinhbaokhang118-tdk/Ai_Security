"""Merge the user-provided real datasets into training corpora.

Inputs (extracted under data/raw/):
    - new_data_urls.csv                (url, status)          -> URL corpus
    - Phishing_Email.csv               (Email Text, Email Type) -> TEXT corpus
    - data/raw/sms/Dataset_5971.csv    (LABEL, TEXT, URL, ...)  -> TEXT + URL corpus
    - n96ncsr5g4-1.zip                 (index.sql + HTML zips)  -> URL + TEXT corpus

Outputs (formats consumed by the training scripts):
    - data/url_dataset.csv             url,label     (1=phishing, 0=benign)
    - data/phishing_text_{train,validation,test}.csv   text,label
    - data/*_dataset.meta.json         data cards

All label mapping is explicit and logged. Dedup + stratified 80/10/10 (seed=42).
"""

from __future__ import annotations

import csv
import io
import json
import os
import re
import zipfile
from dataclasses import dataclass
from html import unescape
from html.parser import HTMLParser
from pathlib import Path

import pandas as pd
from sklearn.model_selection import train_test_split

RAW = os.path.join("data", "raw")
OUT = "data"
SEED = 42
N96_ZIP = "n96ncsr5g4-1.zip"
N96_INDEX_MEMBER = "n96ncsr5g4-1/index.sql"
N96_INDEX_CACHE = os.path.join(RAW, "n96_index.csv")
N96_TEXT_CACHE = os.path.join(RAW, "n96_website_text.csv")
N96_HTML_TEXT_MAX_CHARS = 4000


def _norm_label_url(v) -> int | None:
    s = str(v).strip().lower()
    if s in ("phishing", "1", "malicious", "bad", "phish", "defacement", "malware"):
        return 1
    if s in ("legitimate", "0", "benign", "good", "safe", "ham"):
        return 0
    return None


def _norm_label_text(v) -> int | None:
    s = str(v).strip().lower()
    if "phish" in s or s in ("spam", "1", "smish", "malicious", "scam"):
        return 1
    if "safe" in s or s in ("ham", "0", "benign", "legitimate", "normal"):
        return 0
    return None


@dataclass(frozen=True)
class N96Record:
    rec_id: int
    url: str
    website: str
    label: int


class _VisibleTextExtractor(HTMLParser):
    """Small stdlib-only HTML text extractor for cached training corpora."""

    _SKIP_TAGS = {"script", "style", "noscript", "svg", "canvas"}

    def __init__(self, max_chars: int) -> None:
        super().__init__(convert_charrefs=True)
        self.max_chars = max_chars
        self.parts: list[str] = []
        self._skip_depth = 0
        self._chars = 0

    def handle_starttag(self, tag: str, attrs) -> None:  # noqa: ANN001
        if tag.lower() in self._SKIP_TAGS:
            self._skip_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in self._SKIP_TAGS and self._skip_depth:
            self._skip_depth -= 1

    def handle_data(self, data: str) -> None:
        if self._skip_depth or self._chars >= self.max_chars:
            return
        text = " ".join(unescape(data).split())
        if not text:
            return
        remaining = self.max_chars - self._chars
        chunk = text[:remaining]
        self.parts.append(chunk)
        self._chars += len(chunk)

    def text(self) -> str:
        return " ".join(self.parts)


def _cache_is_fresh(cache_path: str, source_path: str) -> bool:
    return (
        os.path.exists(cache_path)
        and os.path.exists(source_path)
        and os.path.getmtime(cache_path) >= os.path.getmtime(source_path)
    )


def _decode_html(payload: bytes) -> str:
    for encoding in ("utf-8", "windows-1252", "latin-1"):
        try:
            return payload.decode(encoding)
        except UnicodeDecodeError:
            continue
    return payload.decode("utf-8", errors="ignore")


def _html_to_text(payload: bytes, *, url: str, max_chars: int = N96_HTML_TEXT_MAX_CHARS) -> str:
    parser = _VisibleTextExtractor(max_chars=max_chars)
    try:
        parser.feed(_decode_html(payload))
    except Exception:
        text = ""
    else:
        text = parser.text()
    text = re.sub(r"\s+", " ", text).strip()
    merged = f"{url} {text}".strip()
    return merged[:max_chars]


def _sql_unescape(value: str) -> str:
    return value.replace("\\'", "'").replace("\\\\", "\\")


def _parse_n96_index() -> list[N96Record]:
    if not os.path.exists(N96_ZIP):
        return []
    if _cache_is_fresh(N96_INDEX_CACHE, N96_ZIP):
        df = pd.read_csv(N96_INDEX_CACHE)
        return [
            N96Record(int(row.rec_id), str(row.url), str(row.website), int(row.label))
            for row in df.itertuples(index=False)
        ]

    row_re = re.compile(r"\((\d+), '((?:\\'|[^'])*)', '([^']+)', ([01]), '([^']+)'\)")
    with zipfile.ZipFile(N96_ZIP) as outer:
        sql = outer.read(N96_INDEX_MEMBER).decode("utf-8", errors="replace")

    records = [
        N96Record(
            rec_id=int(match.group(1)),
            url=_sql_unescape(match.group(2)).strip(),
            website=match.group(3).strip(),
            label=int(match.group(4)),
        )
        for match in row_re.finditer(sql)
    ]
    os.makedirs(RAW, exist_ok=True)
    pd.DataFrame([record.__dict__ for record in records]).to_csv(
        N96_INDEX_CACHE, index=False, encoding="utf-8"
    )
    return records


def _load_n96_index_frame() -> pd.DataFrame:
    records = _parse_n96_index()
    if not records:
        return pd.DataFrame(columns=["rec_id", "url", "website", "label"])
    return pd.DataFrame([record.__dict__ for record in records])


def _build_n96_text_cache(index_df: pd.DataFrame) -> pd.DataFrame:
    if index_df.empty or not os.path.exists(N96_ZIP):
        return pd.DataFrame(columns=["text", "label", "url", "website"])
    if _cache_is_fresh(N96_TEXT_CACHE, N96_ZIP):
        return pd.read_csv(N96_TEXT_CACHE, encoding="utf-8")

    lookup = {
        str(row.website): (str(row.url), int(row.label))
        for row in index_df[["url", "website", "label"]].itertuples(index=False)
    }
    matched = 0
    os.makedirs(RAW, exist_ok=True)
    with open(N96_TEXT_CACHE, "w", encoding="utf-8", newline="") as out_fh:
        writer = csv.DictWriter(out_fh, fieldnames=["text", "label", "url", "website"])
        writer.writeheader()
        with zipfile.ZipFile(N96_ZIP) as outer:
            for nested_name in outer.namelist():
                if not nested_name.endswith(".zip"):
                    continue
                nested_payload = outer.read(nested_name)
                with zipfile.ZipFile(io.BytesIO(nested_payload)) as nested:
                    for info in nested.infolist():
                        if info.is_dir():
                            continue
                        website = Path(info.filename).name
                        if website not in lookup:
                            continue
                        url, label = lookup[website]
                        text = _html_to_text(nested.read(info), url=url)
                        if len(text) <= 5:
                            text = url
                        writer.writerow(
                            {
                                "text": text,
                                "label": label,
                                "url": url,
                                "website": website,
                            }
                        )
                        matched += 1
                print(f"[n96-text] {nested_name} processed, matched so far={matched}")
    return pd.read_csv(N96_TEXT_CACHE, encoding="utf-8")


def build_url() -> None:
    frames = []
    source_rows: dict[str, int] = {}

    # 1) new_data_urls.csv (url, status)
    p = os.path.join(RAW, "new_data_urls.csv")
    if os.path.exists(p):
        df = pd.read_csv(p, usecols=lambda c: c.lower() in ("url", "status", "label", "type"))
        df.columns = [c.lower() for c in df.columns]
        url_c = "url"
        lab_c = "status" if "status" in df.columns else ("label" if "label" in df.columns else "type")
        df = df[[url_c, lab_c]].rename(columns={url_c: "url", lab_c: "label"})
        df["label"] = df["label"].map(_norm_label_url)
        d = df.dropna()
        frames.append(d)
        source_rows["new_data_urls.csv"] = int(len(d))
        print(f"[url] new_data_urls.csv -> {len(d)} labeled")

    # 2) SMS dataset URLs (URL column, LABEL)
    sms = os.path.join(RAW, "sms", "Dataset_5971.csv")
    if os.path.exists(sms):
        df = pd.read_csv(sms, encoding="utf-8", encoding_errors="ignore")
        if "URL" in df.columns and "LABEL" in df.columns:
            u = df[["URL", "LABEL"]].rename(columns={"URL": "url", "LABEL": "label"})
            u = u[u["url"].astype(str).str.contains("http", na=False)]
            u["label"] = u["label"].map(_norm_label_url)
            d = u.dropna()
            frames.append(d)
            source_rows["SMS URL column"] = int(len(d))
            print(f"[url] SMS urls -> {len(d)} labeled")

    # 3) n96ncsr5g4-1.zip index.sql (url, result)
    n96 = _load_n96_index_frame()
    if not n96.empty:
        d = n96[["url", "label"]].copy()
        d["label"] = d["label"].map(_norm_label_url)
        d = d.dropna()
        frames.append(d)
        source_rows["n96ncsr5g4-1.zip index.sql"] = int(len(d))
        print(f"[url] n96 index.sql -> {len(d)} labeled")

    if not frames:
        print("[url] no sources found")
        return
    df = pd.concat(frames, ignore_index=True)
    df["url"] = df["url"].astype(str).str.strip()
    df = df[df["url"].str.len() > 3].drop_duplicates(subset=["url"])
    df["label"] = df["label"].astype(int)
    df = df.sample(frac=1.0, random_state=SEED)
    out = os.path.join(OUT, "url_dataset.csv")
    df[["url", "label"]].to_csv(out, index=False, encoding="utf-8")
    print(f"[url] SAVED {out} -> {len(df)} rows, counts {dict(df['label'].value_counts())}")
    _meta(
        "url_dataset",
        "user zips: new_data_urls.csv + SMS + n96 index.sql",
        df,
        "url",
        source_rows=source_rows,
    )


def build_text() -> None:
    frames = []
    source_rows: dict[str, int] = {}

    # 1) Phishing_Email.csv (Email Text, Email Type)
    p = os.path.join(RAW, "Phishing_Email.csv")
    if os.path.exists(p):
        df = pd.read_csv(p, encoding="utf-8", encoding_errors="ignore")
        cols = {c.lower(): c for c in df.columns}
        tc = cols.get("email text") or cols.get("text")
        lc = cols.get("email type") or cols.get("type") or cols.get("label")
        if tc and lc:
            d = df[[tc, lc]].rename(columns={tc: "text", lc: "label"})
            d["label"] = d["label"].map(_norm_label_text)
            d = d.dropna()
            frames.append(d)
            source_rows["Phishing_Email.csv"] = int(len(d))
            print(f"[text] Phishing_Email.csv -> {len(d)} labeled")

    # 2) SMS dataset (TEXT, LABEL)
    sms = os.path.join(RAW, "sms", "Dataset_5971.csv")
    if os.path.exists(sms):
        df = pd.read_csv(sms, encoding="utf-8", encoding_errors="ignore")
        if "TEXT" in df.columns and "LABEL" in df.columns:
            d = df[["TEXT", "LABEL"]].rename(columns={"TEXT": "text", "LABEL": "label"})
            d["label"] = d["label"].map(_norm_label_text)
            d = d.dropna()
            frames.append(d)
            source_rows["SMS TEXT column"] = int(len(d))
            print(f"[text] SMS -> {len(d)} labeled")

    # 3) n96 website HTML snapshots -> visible page text
    n96 = _load_n96_index_frame()
    n96_text = _build_n96_text_cache(n96)
    if not n96_text.empty:
        d = n96_text[["text", "label"]].dropna()
        frames.append(d)
        source_rows["n96ncsr5g4-1.zip HTML"] = int(len(d))
        print(f"[text] n96 HTML -> {len(d)} labeled")

    if not frames:
        print("[text] no sources found")
        return
    df = pd.concat(frames, ignore_index=True)
    df["text"] = df["text"].astype(str).str.strip()
    df = df[df["text"].str.len() > 5].drop_duplicates(subset=["text"])
    df["label"] = df["label"].astype(int)

    train, temp = train_test_split(df, test_size=0.2, random_state=SEED, stratify=df["label"])
    val, test = train_test_split(temp, test_size=0.5, random_state=SEED, stratify=temp["label"])
    for name, part in (("train", train), ("validation", val), ("test", test)):
        fp = os.path.join(OUT, f"phishing_text_{name}.csv")
        part[["text", "label"]].to_csv(fp, index=False, encoding="utf-8")
        print(f"[text] SAVED {fp} -> {len(part)} rows")
    _meta(
        "phishing_text",
        "user zips: Phishing_Email.csv + SMS + n96 HTML",
        df,
        "text",
        source_rows=source_rows,
    )


def _meta(
    name: str,
    source: str,
    df: pd.DataFrame,
    col: str,
    *,
    source_rows: dict[str, int] | None = None,
) -> None:
    meta = {
        "source": source,
        "total_rows": int(len(df)),
        "class_counts": {str(k): int(v) for k, v in df["label"].value_counts().items()},
        "format": f"{col},label (1=phishing/spam, 0=benign)",
        "seed": SEED,
    }
    if source_rows:
        meta["source_rows_before_dedup"] = source_rows
    with open(os.path.join(OUT, f"{name}_dataset.meta.json"), "w", encoding="utf-8") as fh:
        json.dump(meta, fh, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    build_url()
    build_text()
    print("DONE.")
