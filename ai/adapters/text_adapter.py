"""Text/Email Risk Adapter (module-specification.md M2).

Preprocessing (HTML strip, Unicode NFC, zero-width removal) + hierarchical chunking
for long documents (design.md §4.2). Pure-Python; the transformer tokenizer is only
used by the training/serving path when transformers is installed.
"""

from __future__ import annotations

import re
import unicodedata
from html.parser import HTMLParser
from urllib.parse import urlsplit

_ZERO_WIDTH = dict.fromkeys(map(ord, "\u200b\u200c\u200d\u2060\ufeff"), None)
_HTML_TAG = re.compile(r"<[^>]+>")
_WS = re.compile(r"\s+")
_SENTENCE_SPLIT = re.compile(r"(?<=[.!?。？！])\s+|\n+")
_LEET_TRANSLATION = str.maketrans({"0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t"})
_PLAIN_URL = re.compile(r"(?:https?://|www\.)[^\s<>\"']+", re.I)


class _MessageLinkParser(HTMLParser):
    """Collect link targets before HTML is converted to visible text."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.urls: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        candidates: list[str | None] = []
        if tag.lower() in {"a", "area", "link"}:
            candidates.append(values.get("href"))
        elif tag.lower() in {"img", "iframe", "form"}:
            candidates.extend((values.get("src"), values.get("action")))
        for value in candidates:
            if value:
                self.urls.append(value.strip())


def extract_message_urls(raw_text: str, metadata: dict | None = None) -> list[str]:
    """Extract visible and hidden HTTP(S) links from message content/metadata.

    The old preprocessing removed HTML tags before inspecting ``href``. That made
    a phishing button such as ``<a href=evil>microsoft.com</a>`` invisible to the
    URL risk core. Only web links are returned; mailto/tel/data/javascript targets
    are intentionally excluded.
    """

    candidates = list(_PLAIN_URL.findall(raw_text or ""))
    parser = _MessageLinkParser()
    try:
        parser.feed(raw_text or "")
        candidates.extend(parser.urls)
    except Exception:
        # Malformed marketing/phishing HTML must not break text assessment.
        pass

    metadata = metadata or {}
    for key in ("html", "raw_html", "body_html"):
        value = metadata.get(key)
        if isinstance(value, str):
            candidates.extend(_PLAIN_URL.findall(value))
            try:
                extra = _MessageLinkParser()
                extra.feed(value)
                candidates.extend(extra.urls)
            except Exception:
                pass
    for key in ("links", "urls", "qr_urls", "attachment_urls"):
        value = metadata.get(key)
        if isinstance(value, str):
            candidates.append(value)
        elif isinstance(value, (list, tuple, set)):
            candidates.extend(str(item) for item in value if item)

    output: list[str] = []
    seen: set[str] = set()
    for raw in candidates:
        value = raw.strip().rstrip(".,;:!?)]}")
        if value.lower().startswith("www."):
            value = "https://" + value
        try:
            parts = urlsplit(value)
        except ValueError:
            continue
        if parts.scheme.lower() not in {"http", "https"} or not parts.hostname:
            continue
        key = value.casefold()
        if key not in seen:
            seen.add(key)
            output.append(value)
    return output[:20]


def normalize_unicode(text: str) -> str:
    """NFC normalize and strip zero-width characters (anti-obfuscation)."""
    return unicodedata.normalize("NFC", text).translate(_ZERO_WIDTH)


def normalize_for_detection(text: str) -> str:
    """Normalize common leetspeak for matching while preserving displayed text."""

    return normalize_unicode(text).lower().translate(_LEET_TRANSLATION)


def strip_html(text: str) -> str:
    return _HTML_TAG.sub(" ", text)


def preprocess_email(raw_text: str, metadata: dict | None = None) -> str:
    """Strip HTML, normalize Unicode, collapse whitespace. Prepend metadata hints."""
    if not raw_text:
        return ""
    urls = extract_message_urls(raw_text, metadata)
    text = strip_html(raw_text)
    text = normalize_unicode(text)
    text = _WS.sub(" ", text).strip()
    if metadata:
        parts = []
        if metadata.get("subject"):
            parts.append(f"[subject] {metadata['subject']}")
        if metadata.get("sender"):
            parts.append(f"[sender] {metadata['sender']}")
        if parts:
            text = " ".join(parts) + " " + text
    if urls:
        # Keep hidden button/QR targets available to both ML and deterministic rules.
        text = text + " " + " ".join(f"[link] {url}" for url in urls)
    return text[:50_000]


def split_sentences(text: str) -> list[str]:
    return [s.strip() for s in _SENTENCE_SPLIT.split(text) if s.strip()]


def chunk_text(clean_text: str, max_words: int = 350, overlap: int = 30) -> list[str]:
    """Split into overlapping chunks by sentence boundaries.

    Uses word-count as a cheap proxy for the 512-token limit (design.md §4.2).
    Aggregation strategy elsewhere is max(risk) so a single malicious chunk flags
    the whole document.
    """
    if not clean_text:
        return []
    sentences = split_sentences(clean_text) or [clean_text]
    chunks: list[str] = []
    current: list[str] = []
    count = 0
    for sent in sentences:
        w = len(sent.split())
        if count + w > max_words and current:
            chunks.append(" ".join(current))
            # keep a small overlap tail for context continuity
            tail = " ".join(current).split()[-overlap:]
            current = [" ".join(tail)] if overlap else []
            count = len(tail)
        current.append(sent)
        count += w
    if current:
        chunks.append(" ".join(current))
    return chunks
