"""Shared constants: risk thresholds, action types, protected assets.

These mirror the design docs (design.md §5, module-specification.md M4) and are the
single source of truth for policy thresholds and enumerations used across the backend,
MCP server, and (indirectly) the clients.
"""

from __future__ import annotations

# --- Risk score thresholds (score is 0..1) --------------------------------------
# Aligns with the Policy Engine decision matrix (module-specification.md M4).
RISK_THRESHOLD_ALLOW = 0.15
RISK_THRESHOLD_WARN = 0.50
RISK_THRESHOLD_BLOCK = 0.85

# --- Frontend 3-tier display scale (score 0..100) -------------------------------
# Mirrors lib/risk.ts on the web app: safe 0-39, warn 40-69, danger 70-100.
DISPLAY_SAFE_MAX = 39
DISPLAY_WARN_MAX = 69

# --- Sensitive data types that escalate action risk -----------------------------
SENSITIVE_DATA_TYPES: frozenset[str] = frozenset(
    {
        "password",
        "credit_card",
        "api_key",
        "private_key",
        "session_token",
        "payment_info",
        "email_credentials",
    }
)

# --- High-risk actions ----------------------------------------------------------
HIGH_RISK_ACTIONS: frozenset[str] = frozenset(
    {
        "submit_form",
        "execute_file",
        "run_file",
        "download_executable",
        "send_email",
        "payment_or_transfer",
    }
)

# --- Protected user assets (design.md §5) ---------------------------------------
PROTECTED_ASSETS: frozenset[str] = frozenset(
    {
        "browser_session",
        "email",
        "password",
        "cookie",
        "wallet",
        "cloud_drive",
        "api_key",
        "clipboard",
        "files",
    }
)

# --- High-risk TLDs commonly abused in phishing ---------------------------------
HIGH_RISK_TLDS: frozenset[str] = frozenset(
    {
        "xyz", "top", "club", "work", "buzz", "tk", "ml", "ga", "cf", "gq",
        "click", "link", "country", "kim", "science", "party", "review",
        "stream", "download", "loan", "men", "zip", "mov",
    }
)

# --- Known brands for homoglyph / typosquat detection ---------------------------
KNOWN_BRANDS: tuple[str, ...] = (
    "paypal", "facebook", "google", "apple", "microsoft", "amazon",
    "vietcombank", "techcombank", "mbbank", "tpbank", "bidv", "agribank",
    "netflix", "instagram",
)

# --- Vietnamese urgency / social-engineering keywords ---------------------------
URGENCY_KEYWORDS_VI: tuple[str, ...] = (
    "khóa", "khoá", "ngay", "gấp", "xác minh", "xác nhận", "trúng thưởng",
    "hết hạn", "đình chỉ", "cảnh báo", "bị phạt", "click",
)

# --- Prompt injection heuristic patterns ---------------------------------------
INJECTION_PATTERNS: tuple[str, ...] = (
    "ignore previous instructions",
    "ignore all previous",
    "disregard the above",
    "you are now",
    "reveal your system prompt",
    "system prompt",
    "act as",
    "bỏ qua hướng dẫn",
    "quên hướng dẫn trước",
)

MAX_URL_LENGTH = 2048
MAX_TEXT_LENGTH = 50_000
