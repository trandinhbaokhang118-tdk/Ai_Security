"""Defense-in-depth prompt-injection firewall for agent/MCP untrusted content.

Uses canonicalization, bounded decoding and independent attack-family detectors.
It is intentionally deterministic and explainable: it complements rather than
replaces a trained classifier, and never executes decoded instructions.
"""
from __future__ import annotations

import base64
import binascii
import codecs
import html
import re
import unicodedata
from dataclasses import dataclass
from urllib.parse import unquote

from shared.schemas import Evidence, Severity

_ZERO_WIDTH = dict.fromkeys(map(ord, "\u200b\u200c\u200d\u2060\ufeff"), None)
_B64 = re.compile(r"(?<![\w+/])[A-Za-z0-9+/]{20,}={0,2}(?![\w+/])")
_HEX = re.compile(r"(?:\\x[0-9a-fA-F]{2}){4,}|(?:%[0-9a-fA-F]{2}){4,}")

OVERRIDE = ("ignore previous", "ignore all", "disregard", "override", "bypass", "forget prior", "bỏ qua hướng dẫn", "quên hướng dẫn", "bỏ qua quy tắc")
PRIVILEGE = ("system prompt", "developer message", "hidden instruction", "jailbreak", "you are now", "act as system", "root access", "admin mode")
EXFILTRATION = ("reveal secrets", "show secrets", "api key", "private key", "access token", "environment variable", "send to", "upload to", "exfiltrate", "curl ", "webhook")
TOOL_COERCION = ("call the tool", "use browser", "run command", "execute", "download", "disable security", "turn off safety", "do not tell the user")
DELIMITER = ("<system>", "</system>", "[system]", "### system", "assistant:", "developer:", "begin system")

@dataclass(frozen=True)
class PromptFirewallAssessment:
    score: float
    evidence: list[Evidence]
    attack_families: tuple[str, ...]


def _canon(value: str) -> str:
    value = html.unescape(unquote(unicodedata.normalize("NFKC", value).translate(_ZERO_WIDTH)))
    return re.sub(r"\s+", " ", value).strip().lower()


def _decoded_views(text: str) -> list[str]:
    views = [_canon(text)]
    for match in _B64.finditer(text):
        try:
            raw = base64.b64decode(match.group(0) + "===", validate=False)
            candidate = raw.decode("utf-8", errors="ignore")
            if candidate and sum(char.isprintable() for char in candidate) / max(1, len(candidate)) > .75:
                views.append(_canon(candidate[:4000]))
        except (ValueError, binascii.Error):
            pass
    for match in _HEX.finditer(text):
        raw = match.group(0)
        try:
            candidate = bytes.fromhex(raw.replace("\\x", "").replace("%", "")).decode("utf-8", "ignore")
            if candidate:
                views.append(_canon(candidate[:4000]))
        except ValueError:
            pass
    return views[:8]


def _e(message: str, severity: Severity, feature: str, contribution: float) -> Evidence:
    return Evidence(source="prompt_firewall", message=message, severity=severity, feature=feature, contribution=contribution)


def assess_prompt_firewall(content: str) -> PromptFirewallAssessment:
    views = _decoded_views(content)
    joined = " ".join(views)
    score = .02
    evidence: list[Evidence] = []
    families: list[str] = []
    def hit(terms: tuple[str, ...]) -> list[str]: return [term for term in terms if term in joined]
    override, privilege, exfiltration, tools, delimiters = hit(OVERRIDE), hit(PRIVILEGE), hit(EXFILTRATION), hit(TOOL_COERCION), hit(DELIMITER)
    if override:
        score += .35; families.append("instruction_override")
        evidence.append(_e("Phát hiện lệnh ghi đè/chống lại chỉ dẫn ưu tiên.", Severity.CRITICAL, "instruction_override", .35))
    if privilege:
        score += .22; families.append("privilege_escalation")
        evidence.append(_e("Nội dung cố giả mạo hoặc yêu cầu quyền hệ thống/developer.", Severity.CRITICAL, "privilege_escalation", .22))
    if exfiltration:
        score += .24; families.append("data_exfiltration")
        evidence.append(_e("Nội dung yêu cầu bí mật, token hoặc gửi dữ liệu ra ngoài.", Severity.CRITICAL, "data_exfiltration", .24))
    if tools:
        score += .14; families.append("tool_coercion")
        evidence.append(_e("Nội dung thúc ép agent gọi công cụ/thực thi thao tác không được ủy quyền.", Severity.HIGH, "tool_coercion", .14))
    if delimiters:
        score += .12; families.append("role_delimiter_spoofing")
        evidence.append(_e("Phát hiện delimiter/role giả mạo nhằm làm lẫn thứ bậc chỉ dẫn.", Severity.HIGH, "role_delimiter_spoofing", .12))
    if len(views) > 1:
        score += .10; families.append("encoded_payload")
        evidence.append(_e("Phát hiện payload mã hóa; nội dung giải mã được kiểm tra như dữ liệu không tin cậy.", Severity.HIGH, "encoded_payload", .10))
    if override and (exfiltration or tools):
        score += .15; families.append("multi_stage_attack")
        evidence.append(_e("Chuỗi tấn công đa giai đoạn: override kết hợp hành động/tool hoặc exfiltration.", Severity.CRITICAL, "multi_stage_attack", .15))
    if not evidence:
        evidence.append(_e("Không thấy mẫu prompt injection rõ rệt ở lớp firewall xác định.", Severity.INFO, "no_firewall_signal", 0.0))
    return PromptFirewallAssessment(min(1.0, score), evidence, tuple(dict.fromkeys(families)))
