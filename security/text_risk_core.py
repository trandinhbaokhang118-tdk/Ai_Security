"""Explainable production-oriented phishing core for email and SMS.

Designed as a deterministic complement to ML: it detects social engineering,
identity mismatch and obfuscation while preserving evidence for audit/review.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from email.utils import parseaddr

from ai.adapters.text_adapter import normalize_for_detection
from ai.adapters.url_adapter import analyze_url_signals
from shared.schemas import Evidence, Severity

_URL = re.compile(r"(?:https?://|www\.)[^\s<>\"']+", re.I)
_EMAIL = re.compile(r"[\w.+-]+@[\w.-]+\.[a-z]{2,}", re.I)

URGENCY = ("ngay", "gấp", "khẩn cấp", "hết hạn", "đình chỉ", "khóa", "khoá", "within", "urgent", "immediately", "suspended")
CREDENTIALS = ("mật khẩu", "password", "otp", "mã xác minh", "verification code", "cvv", "thẻ", "card", "seed phrase", "private key")
REWARDS = ("trúng thưởng", "nhận quà", "hoàn tiền", "ưu đãi", "gift", "prize", "reward", "refund")
ACTION = ("bấm", "nhấp", "click", "truy cập", "xác minh", "verify", "đăng nhập", "login", "cập nhật", "update")

@dataclass(frozen=True)
class TextRiskAssessment:
    score: float
    evidence: list[Evidence]


def _e(message: str, severity: Severity, feature: str, contribution: float) -> Evidence:
    return Evidence(source="text_risk_core", message=message, severity=severity, feature=feature, contribution=round(contribution, 3))


def assess_text_risk(text: str, modality: str = "email", metadata: dict | None = None, model_score: float | None = None) -> TextRiskAssessment:
    normalized = normalize_for_detection(text)
    score = 0.03
    evidence: list[Evidence] = []
    urgency_hits = [word for word in URGENCY if word in normalized]
    credential_hits = [word for word in CREDENTIALS if word in normalized]
    action_hits = [word for word in ACTION if word in normalized]
    reward_hits = [word for word in REWARDS if word in normalized]
    urls = _URL.findall(text)

    if urgency_hits:
        score += min(.18, .06 * len(urgency_hits))
        evidence.append(_e("Ngôn ngữ thúc ép/thời hạn ngắn: " + ", ".join(urgency_hits[:3]), Severity.MEDIUM, "urgency_pressure", min(.18, .06 * len(urgency_hits))))
    if credential_hits:
        score += min(.28, .10 * len(credential_hits))
        evidence.append(_e("Nội dung yêu cầu dữ liệu nhạy cảm: " + ", ".join(credential_hits[:3]), Severity.HIGH, "credential_request", min(.28, .10 * len(credential_hits))))
    if reward_hits:
        score += .10
        evidence.append(_e("Nội dung dùng mồi quà tặng/hoàn tiền/trúng thưởng.", Severity.MEDIUM, "reward_lure", .10))
    if urgency_hits and credential_hits and action_hits:
        score += .20
        evidence.append(_e("Kết hợp thúc ép + yêu cầu thông tin nhạy cảm + kêu gọi hành động là mẫu phishing mạnh.", Severity.CRITICAL, "social_engineering_cluster", .20))
    for url in urls[:5]:
        try:
            url_score = analyze_url_signals(url).brand_mismatch or analyze_url_signals(url).homoglyph
            if url_score:
                score += .24
                evidence.append(_e("Liên kết trong nội dung có dấu hiệu giả mạo thương hiệu/homoglyph.", Severity.CRITICAL, "malicious_embedded_url", .24))
        except ValueError:
            score += .08
            evidence.append(_e("Liên kết trong nội dung bị định dạng bất thường.", Severity.LOW, "malformed_embedded_url", .08))
    if modality == "sms" and (urls or credential_hits):
        score += .08
        evidence.append(_e("SMS chứa liên kết hoặc yêu cầu thông tin nhạy cảm; cần xác minh qua kênh chính thức.", Severity.MEDIUM, "sms_smishing_pattern", .08))
    if metadata and modality == "email":
        sender = str(metadata.get("sender", ""))
        _, address = parseaddr(sender)
        subject = normalize_for_detection(str(metadata.get("subject", "")))
        if address and any(term in subject for term in ("bank", "ngan hang", "paypal", "microsoft")) and address.split("@")[-1] in {"gmail.com", "yahoo.com", "outlook.com"}:
            score += .18
            evidence.append(_e("Tên hiển thị/chủ đề mang thương hiệu nhưng người gửi dùng email công cộng.", Severity.HIGH, "sender_brand_mismatch", .18))
    final = max(score, float(model_score or 0.0))
    if not evidence:
        evidence.append(_e("Không phát hiện tín hiệu lừa đảo rõ rệt trong nội dung ngoại tuyến.", Severity.INFO, "no_text_signal", 0.0))
    return TextRiskAssessment(min(1.0, final), evidence)
