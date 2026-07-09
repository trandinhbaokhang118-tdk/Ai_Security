"""Text/Email Risk Adapter (module-specification.md M2).

Preprocessing (HTML strip, Unicode NFC, zero-width removal) + hierarchical chunking
for long documents (design.md §4.2). Pure-Python; the transformer tokenizer is only
used by the training/serving path when transformers is installed.
"""

from __future__ import annotations

import re
import unicodedata

_ZERO_WIDTH = dict.fromkeys(map(ord, "\u200b\u200c\u200d\u2060\ufeff"), None)
_HTML_TAG = re.compile(r"<[^>]+>")
_WS = re.compile(r"\s+")
_SENTENCE_SPLIT = re.compile(r"(?<=[.!?。？！])\s+|\n+")


def normalize_unicode(text: str) -> str:
    """NFC normalize and strip zero-width characters (anti-obfuscation)."""
    return unicodedata.normalize("NFC", text).translate(_ZERO_WIDTH)


def strip_html(text: str) -> str:
    return _HTML_TAG.sub(" ", text)


def preprocess_email(raw_text: str, metadata: dict | None = None) -> str:
    """Strip HTML, normalize Unicode, collapse whitespace. Prepend metadata hints."""
    if not raw_text:
        return ""
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
