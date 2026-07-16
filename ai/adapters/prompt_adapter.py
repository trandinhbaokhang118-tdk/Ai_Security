"""Prompt Injection Adapter (module-specification.md M3).

Heuristic detection of instruction-hijacking. When the protectai ONNX model is present
the engine uses it; otherwise this rule layer provides a deterministic fallback (also
acts as the documented secondary defense).
"""

from __future__ import annotations

import base64
import re

from shared.constants import INJECTION_PATTERNS

_BASE64_RE = re.compile(r"[A-Za-z0-9+/]{24,}={0,2}")
_LEET_TRANSLATION = str.maketrans({"0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t"})


def _decode_base64_segments(text: str) -> str:
    """Best-effort decode of base64-looking segments to catch wrapped payloads."""
    decoded_parts: list[str] = []
    for m in _BASE64_RE.finditer(text):
        try:
            raw = base64.b64decode(m.group(0) + "===", validate=False)
            decoded_parts.append(raw.decode("utf-8", errors="ignore"))
        except Exception:
            continue
    return " ".join(decoded_parts)


def detect_injection(text: str) -> tuple[float, list[str]]:
    """Return (injection_probability, matched_patterns) via heuristics.

    Checks the raw text plus any base64-decoded segments (test-plan case 2.3).
    """
    if not text:
        return 0.0, []
    haystack = (text + " " + _decode_base64_segments(text)).lower().translate(_LEET_TRANSLATION)
    matches = [p for p in INJECTION_PATTERNS if p in haystack]

    # Guard against false positives on benign security questions
    # ("explain what prompt injection is") — require an imperative/override cue.
    benign_cue = re.search(r"\b(what is|explain|định nghĩa|là gì)\b", haystack)
    override_cue = re.search(
        r"\b(ignore|disregard|reveal|bypass|override|bỏ qua|quên)\b", haystack
    )
    if matches and benign_cue and not override_cue:
        return 0.1, []

    if not matches:
        return 0.05, []
    prob = min(0.5 + 0.2 * len(matches), 0.99)
    return prob, matches
