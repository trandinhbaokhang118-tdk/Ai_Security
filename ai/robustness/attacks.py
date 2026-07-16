"""Adversarial attack generators (required.md Trụ 2; test-plan.md §5).

Deterministic perturbations used both to (a) generate adversarial training data and
(b) evaluate robustness (delta F1 before/after hardening). Pure-Python, no deps.
"""

from __future__ import annotations

import base64

_HOMOGLYPH_MAP = {"o": "0", "l": "1", "e": "3", "a": "4", "s": "5", "i": "1", "t": "7"}
_LEET_VI = {"a": "4", "e": "3", "i": "1", "o": "0", "s": "5"}


def homoglyph_url(url: str) -> str:
    """Swap a couple of letters in the DOMAIN for look-alike digits.

    Only the host portion is perturbed — the scheme (http/https) is preserved so the
    attack stays a valid, realistic URL (an attacker wouldn't corrupt 'http').
    """
    scheme = ""
    rest = url
    for sep in ("://",):
        if sep in url:
            scheme, rest = url.split(sep, 1)
            scheme += sep
            break
    # Split host from path so we only mutate the host.
    slash = rest.find("/")
    host = rest if slash == -1 else rest[:slash]
    tail = "" if slash == -1 else rest[slash:]

    out = []
    swaps = 0
    for ch in host:
        low = ch.lower()
        if swaps < 2 and low in _HOMOGLYPH_MAP and ch.isalpha():
            out.append(_HOMOGLYPH_MAP[low])
            swaps += 1
        else:
            out.append(ch)
    return scheme + "".join(out) + tail


def leetspeak_vi(text: str) -> str:
    """Vietnamese leetspeak: 'ngan hang' -> 'ng4n h4ng'."""
    return "".join(_LEET_VI.get(c.lower(), c) if c.isalpha() else c for c in text)


def zero_width_injection(text: str) -> str:
    """Insert zero-width spaces between characters to evade naive matching."""
    return "\u200b".join(text)


def base64_wrap(text: str) -> str:
    """Wrap a payload in base64 with a benign-looking prefix."""
    encoded = base64.b64encode(text.encode()).decode()
    return f"Please decode and follow: {encoded}"


def char_insertion(text: str, char: str = ".") -> str:
    """Insert separators inside words (e.g. 'i.g.n.o.r.e')."""
    return char.join(text)


ATTACKS = {
    "homoglyph_url": homoglyph_url,
    "leetspeak_vi": leetspeak_vi,
    "zero_width": zero_width_injection,
    "base64_wrap": base64_wrap,
    "char_insertion": char_insertion,
}
