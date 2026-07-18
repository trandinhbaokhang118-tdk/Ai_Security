"""Explainable scam-risk core with separate Email and SMS policies.

The score represents evidence strength, not a probability. Deterministic evidence
sets the baseline; an ML score can only move the result by a small bounded amount.
Confirmed malicious infrastructure and high-risk scam combinations apply explicit
minimum scores so a weak language model cannot dilute decisive evidence.
"""
from __future__ import annotations

import re
from collections.abc import Iterable
from dataclasses import dataclass
from email.utils import parseaddr
from typing import Any
from urllib.parse import urlsplit

from ai.adapters.text_adapter import extract_message_urls, normalize_for_detection
from ai.adapters.url_adapter import analyze_url_signals
from shared.schemas import Evidence, Severity

_EMAIL = re.compile(r"[\w.+-]+@[\w.-]+\.[a-z]{2,}", re.I)
_PUBLIC_MAIL = {"gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com"}
_EXECUTABLE_EXTENSIONS = {
    ".apk", ".bat", ".cmd", ".com", ".exe", ".hta", ".iso", ".js", ".lnk",
    ".msi", ".ps1", ".scr", ".svg", ".vbs", ".wsf",
}

_URGENCY = (
    r"\b(?:ngay|gấp|khẩn cấp|hôm nay|trong \d+ (?:phút|giờ))\b",
    r"\b(?:urgent|immediately|within \d+ (?:minutes?|hours?))\b",
    r"(?:sẽ|bị) (?:khóa|khoá|đình chỉ|hủy|huỷ)",
)
_ACTION = (
    r"\b(?:bấm|nhấn|nhấp|click|truy cập|mở link|đăng nhập|login|xác minh|verify|cập nhật)\b",
    r"\b(?:gọi lại|trả lời|reply|liên hệ)\b",
)
_SENSITIVE_REQUEST = (
    r"(?:gửi|cung cấp|chia sẻ|đọc|nhập|xác nhận).{0,35}(?:otp|mã xác minh|mã khôi phục|mật khẩu|password|cvv|số thẻ|seed phrase|private key)",
    r"(?:otp|mã xác minh|mã khôi phục|mật khẩu|password|cvv|số thẻ|seed phrase|private key).{0,35}(?:gửi|cung cấp|chia sẻ|đọc|nhập|xác nhận)",
    r"(?:đăng nhập|login).{0,45}(?:link|liên kết|tài khoản)",
)
_PAYMENT = (
    r"\b(?:chuyển khoản|chuyển tiền|thanh toán|nộp tiền|nạp tiền|đóng phí|mua thẻ quà|gift card)\b",
    r"\b(?:bitcoin|usdt|tiền (?:ảo|số)|crypto|ví điện tử|tài khoản an toàn)\b",
)
_BEC_CHANGE = (
    r"(?:đổi|thay đổi|cập nhật|mới).{0,40}(?:số tài khoản|tài khoản (?:nhận|thanh toán)|ngân hàng thụ hưởng|thông tin thanh toán)",
    r"(?:pay|payment|invoice).{0,35}(?:new|updated|different).{0,30}(?:account|bank)",
)
_SECRECY = (r"\b(?:bí mật|không nói với ai|không gọi|giữ kín|confidential|do not tell|không cần duyệt)\b",)
_AUTHORITY = (
    r"\b(?:tôi là|thay mặt|theo chỉ đạo).{0,30}(?:giám đốc|sếp|ceo|cfo|lãnh đạo|kế toán|đối tác)\b",
    r"\b(?:ceo|cfo|giám đốc|sếp|lãnh đạo)\b",
)
_BRANDS = (
    "vietcombank", "vietinbank", "bidv", "techcombank", "mb bank", "momo",
    "zalopay", "paypal", "microsoft", "google", "apple", "netflix", "shopee",
    "lazada", "grab", "dhl", "fedex", "vnpost", "ghn", "viettel", "vinaphone",
    "mobifone", "công an", "tòa án", "toà án", "thuế", "ngân hàng", "bank",
)
_SMS_DELIVERY_DEBT = (
    r"\b(?:bưu kiện|đơn hàng|giao hàng|phí giao|hải quan|phạt nguội|thu phí|nợ cước|nợ thuế)\b",
)
_SMS_JOB = (
    r"\b(?:việc online|việc tại nhà|làm nhiệm vụ|chốt đơn|đánh giá sản phẩm|hoa hồng)\b",
)
_SMS_INVESTMENT = (
    r"\b(?:đầu tư|lợi nhuận|sàn giao dịch|bitcoin|usdt|crypto|tiền số|chứng khoán)\b",
)
_SMS_WRONG_NUMBER = (r"\b(?:nhầm số|kết bạn|làm quen|wrong number)\b",)
_MOVE_PLATFORM = (r"\b(?:telegram|zalo|whatsapp|line).{0,35}(?:nhắn|chat|liên hệ|trao đổi|kết bạn|tham gia)\b",)
_REMOTE_APP = (r"(?:cài|tải|download).{0,30}(?:apk|ứng dụng|app|anydesk|teamviewer|điều khiển từ xa)",)
_REWARD = (r"\b(?:trúng thưởng|nhận quà|hoàn tiền|ưu đãi|gift|prize|reward|refund)\b",)


@dataclass(frozen=True)
class TextRiskAssessment:
    score: float
    evidence: list[Evidence]


def _e(message: str, severity: Severity, feature: str, contribution: float) -> Evidence:
    return Evidence(
        source="text_risk_core",
        message=message,
        severity=severity,
        feature=feature,
        contribution=round(contribution, 3),
    )


def _matches(text: str, patterns: Iterable[str]) -> bool:
    return any(re.search(pattern, text, re.I | re.S) for pattern in patterns)


def _sensitive_request(text: str) -> bool:
    """Return true only for an actual request, not an anti-fraud warning.

    Transactional OTP messages commonly say "không chia sẻ mã OTP". The former
    regex saw the words "chia sẻ" and "OTP" and applied an 85-point floor even
    though the verb was explicitly negated.
    """

    negated_action = re.compile(
        r"(?:không|đừng|chớ|never|do not|don't|tuyệt đối không)\s+"
        r"(?:bao giờ\s+)?(?:gửi|cung cấp|chia sẻ|đọc|nhập|xác nhận|yêu cầu)",
        re.I,
    )
    for pattern in _SENSITIVE_REQUEST:
        for match in re.finditer(pattern, text, re.I | re.S):
            context = text[max(0, match.start() - 35): min(len(text), match.end() + 20)]
            if negated_action.search(context):
                continue
            return True
    return False


def _status(metadata: dict[str, Any], key: str) -> str:
    auth = metadata.get("authentication")
    value = auth.get(key) if isinstance(auth, dict) else metadata.get(key)
    return str(value or "").strip().lower()


def _domain(value: str) -> str:
    _, address = parseaddr(value)
    if "@" in address:
        return address.rsplit("@", 1)[-1].lower().rstrip(".")
    try:
        return (urlsplit(value).hostname or "").lower().rstrip(".")
    except ValueError:
        return ""


def _unrelated_domains(left: str, right: str) -> bool:
    if not left or not right:
        return False
    return not (left == right or left.endswith("." + right) or right.endswith("." + left))


def _attachment_signals(metadata: dict[str, Any]) -> tuple[float, float, list[Evidence]]:
    score = 0.0
    floor = 0.0
    evidence: list[Evidence] = []
    raw = metadata.get("attachments", [])
    attachments = raw if isinstance(raw, list) else []
    for item in attachments[:20]:
        if not isinstance(item, dict):
            continue
        filename = str(item.get("filename", "")).lower()
        detected = str(item.get("detected_type") or item.get("mime_type") or "").lower()
        suffixes = re.findall(r"\.[a-z0-9]{1,8}", filename)
        dangerous = any(ext in _EXECUTABLE_EXTENSIONS for ext in suffixes[-2:])
        double_extension = len(suffixes) >= 2 and suffixes[-1] in _EXECUTABLE_EXTENSIONS
        mismatch = bool(item.get("type_mismatch"))
        contains_macro = bool(item.get("contains_macro"))
        archive_encrypted = bool(item.get("archive_encrypted"))
        active_pdf_content = bool(item.get("active_pdf_content"))
        confirmed = bool(item.get("malicious") or item.get("sandbox_malicious"))
        if confirmed:
            floor = max(floor, 0.95)
            score += 0.15
            evidence.append(_e(f"Tệp {filename or '(không tên)'} được xác nhận có hành vi độc hại.", Severity.CRITICAL, "E-FILE-01-confirmed", 0.15))
        elif dangerous or double_extension or mismatch:
            score += 0.12
            detail = "đuôi/loại tệp có khả năng chạy mã" if dangerous else "loại thật không khớp tên tệp"
            evidence.append(_e(f"Tệp {filename or detected or '(không tên)'} có {detail}.", Severity.HIGH, "E-FILE-01", 0.12))
        elif contains_macro or active_pdf_content:
            score += 0.10
            detail = "chứa macro" if contains_macro else "chứa hành động/script PDF tự kích hoạt"
            evidence.append(_e(f"Tệp {filename or detected or '(không tên)'} {detail}.", Severity.HIGH, "E-FILE-01-active-content", 0.10))
        if archive_encrypted:
            score += 0.05
            evidence.append(_e(f"Tệp nén {filename or '(không tên)'} được mã hóa nên chưa thể đọc nội dung bên trong.", Severity.MEDIUM, "E-FILE-archive-encrypted", 0.05))
    qr_urls = metadata.get("qr_urls")
    if isinstance(qr_urls, (list, tuple)) and qr_urls:
        score += 0.06
        evidence.append(_e("Phát hiện liên kết được giấu trong mã QR; trang đích cần được kiểm tra riêng.", Severity.MEDIUM, "E-FILE-02", 0.06))
    return min(score, 0.15), floor, evidence


def _email_risk(text: str, raw_text: str, metadata: dict[str, Any]) -> tuple[float, float, list[Evidence]]:
    score = 0.03
    floor = 0.0
    evidence: list[Evidence] = []
    subject = normalize_for_detection(str(metadata.get("subject", "")))
    combined = f"{subject} {text}"
    sender = str(metadata.get("from") or metadata.get("sender") or "")
    reply_to = str(metadata.get("reply_to") or metadata.get("reply-to") or "")
    return_path = str(metadata.get("return_path") or metadata.get("return-path") or "")
    message_id = str(metadata.get("message_id") or "")
    sender_domain = _domain(sender)
    reply_domain = _domain(reply_to)
    return_domain = _domain(return_path)
    message_id_domain = _domain(message_id)
    brand_claim = any(term in combined for term in _BRANDS)
    action = _matches(combined, _ACTION)
    urgency = _matches(combined, _URGENCY)
    sensitive = _sensitive_request(combined)
    payment = _matches(combined, _PAYMENT)
    bec_change = _matches(combined, _BEC_CHANGE)
    secrecy = _matches(combined, _SECRECY)
    authority = _matches(combined, _AUTHORITY)
    account_threat = bool(re.search(
        r"(?:tài khoản|tai khoan).{0,55}(?:khóa|khoá|khoa|đình chỉ|dinh chi|suspended|locked)",
        combined,
        re.I | re.S,
    ))

    if reply_domain and _unrelated_domains(sender_domain, reply_domain):
        score += 0.10
        evidence.append(_e("Địa chỉ nhận trả lời thuộc domain khác với người gửi.", Severity.HIGH if action else Severity.MEDIUM, "E-ID-02", 0.10))
    if return_domain and _unrelated_domains(sender_domain, return_domain):
        score += 0.06
        evidence.append(_e("Đường hoàn thư không khớp domain người gửi.", Severity.MEDIUM, "E-ID-05", 0.06))
    if (
        message_id_domain
        and _unrelated_domains(sender_domain, message_id_domain)
        and not metadata.get("forwarded")
    ):
        score += 0.05
        evidence.append(_e("Domain trong Message-ID không khớp người gửi tự nhận.", Severity.MEDIUM, "E-ID-05-message-id", 0.05))
    display_name, _ = parseaddr(sender)
    display_claim = normalize_for_detection(display_name)
    if sender_domain in _PUBLIC_MAIL and any(term in f"{display_claim} {subject}" for term in _BRANDS):
        score += 0.14
        evidence.append(_e("Tên hiển thị/chủ đề tự nhận thương hiệu nhưng thư đến từ dịch vụ email công cộng.", Severity.HIGH, "E-ID-01", 0.14))

    dmarc = _status(metadata, "dmarc")
    dkim = _status(metadata, "dkim")
    spf = _status(metadata, "spf")
    dmarc_failed = dmarc in {"fail", "failed", "softfail", "temperror", "permerror"}
    if dmarc_failed:
        contribution = 0.16 if brand_claim and (action or payment) else 0.07
        score += contribution
        evidence.append(_e("DMARC không xác thực được domain trong địa chỉ From.", Severity.HIGH if contribution > 0.10 else Severity.MEDIUM, "E-ID-03", contribution))
    if spf in {"fail", "failed", "softfail"}:
        contribution = 0.02 if dkim in {"pass", "passed"} or bool(metadata.get("forwarded")) else 0.05
        score += contribution
        evidence.append(_e("SPF không đạt; kết quả này chỉ là dấu hiệu phụ vì thư có thể được chuyển tiếp.", Severity.LOW, "E-ID-04", contribution))

    urls = extract_message_urls(raw_text, metadata)
    if urls:
        score += 0.04
        evidence.append(_e(f"Email chứa {len(urls)} liên kết; từng trang đích được chuyển sang bộ kiểm tra website.", Severity.LOW, "E-WEB-link-present", 0.04))
    mismatches = metadata.get("display_link_mismatches")
    if isinstance(mismatches, list) and mismatches:
        score += 0.14
        evidence.append(_e("Chữ hiển thị của liên kết khác domain đích thực tế.", Severity.HIGH, "E-WEB-01-display-target", 0.14))
    for url in urls[:5]:
        try:
            signals = analyze_url_signals(url)
        except ValueError:
            continue
        if signals.brand_mismatch or signals.homoglyph:
            score += 0.18
            evidence.append(_e("Một liên kết có domain gần giống hoặc không khớp thương hiệu.", Severity.HIGH, "E-WEB-01", 0.18))
            break
    shorteners = {"bit.ly", "tinyurl.com", "t.co", "cutt.ly", "is.gd", "rb.gy", "shorturl.at"}
    if any(_domain(url) in shorteners for url in urls):
        score += 0.10
        evidence.append(_e("Email dùng liên kết rút gọn nên người nhận không thấy rõ trang đích.", Severity.HIGH, "E-WEB-shortlink", 0.10))
    if metadata.get("malicious_url_confirmed") or metadata.get("malicious_attachment_confirmed"):
        floor = max(floor, 0.90)
        evidence.append(_e("Nguồn đối chứng uy tín xác nhận liên kết hoặc tệp là độc hại.", Severity.CRITICAL, "E-WEB-02", 0.22))
    if metadata.get("website_collects_sensitive") and metadata.get("website_brand_impersonation"):
        floor = max(floor, 0.90)
        evidence.append(_e("Trang cuối giả thương hiệu và thu mật khẩu, OTP hoặc dữ liệu thẻ.", Severity.CRITICAL, "E-WEB-03", 0.24))

    if urgency:
        score += 0.05
        evidence.append(_e("Email dùng thời hạn hoặc hậu quả để thúc ép quyết định.", Severity.MEDIUM, "email_urgency", 0.05))
    if sensitive:
        score += 0.16
        evidence.append(_e("Email yêu cầu cung cấp/nhập thông tin xác thực hoặc tài chính nhạy cảm.", Severity.HIGH, "email_sensitive_request", 0.16))
    if brand_claim and account_threat and action:
        floor = max(floor, 0.50)
        score += 0.22
        evidence.append(_e("Nội dung tự nhận ngân hàng/tổ chức, báo khóa tài khoản và yêu cầu xác minh.", Severity.HIGH, "email_brand_account_threat", 0.22))
    if urls and urgency and action:
        score += 0.20
        evidence.append(_e("Cảnh báo khóa/đình chỉ tài khoản đi kèm liên kết và yêu cầu hành động ngay.", Severity.HIGH, "email_account_takeover_cluster", 0.20))
    if bec_change:
        score += 0.17
        evidence.append(_e("Email yêu cầu thay đổi tài khoản nhận tiền hoặc quy trình thanh toán.", Severity.HIGH, "E-BEC-01", 0.17))
    if authority and bec_change and payment and (urgency or secrecy):
        floor = max(floor, 0.85)
        score += 0.12
        evidence.append(_e("Tổ hợp giả lãnh đạo/đối tác, đổi thông tin thanh toán và thúc ép/bí mật là mẫu BEC rất mạnh.", Severity.CRITICAL, "E-BEC-02", 0.12))
    elif payment and (urgency or secrecy):
        score += 0.08
        evidence.append(_e("Yêu cầu thanh toán đi kèm thúc ép hoặc giữ bí mật.", Severity.HIGH, "payment_pressure", 0.08))
    if dmarc_failed and brand_claim and (sensitive or payment):
        floor = max(floor, 0.85)

    attachment_score, attachment_floor, attachment_evidence = _attachment_signals(metadata)
    score += attachment_score
    floor = max(floor, attachment_floor)
    evidence.extend(attachment_evidence)
    if metadata.get("qr_credential_page"):
        floor = max(floor, 0.85)
    if metadata.get("payment_account_changed"):
        score += 0.12
        evidence.append(_e("Thông tin nhận tiền khác với lịch sử giao dịch trước.", Severity.HIGH, "E-CONTEXT-payment-change", 0.12))
    if metadata.get("thread_mismatch"):
        score += 0.07
        evidence.append(_e("Email không khớp chuỗi hội thoại mà nó tự nhận đang trả lời.", Severity.MEDIUM, "E-CONTEXT-thread-mismatch", 0.07))
    if metadata.get("gmail_spam_or_phishing"):
        score += 0.10
        evidence.append(_e("Nhà cung cấp hộp thư đã gắn nhãn Spam/Phishing.", Severity.HIGH, "E-CONTEXT-provider-label", 0.10))
    return score, floor, evidence


def _sms_risk(text: str, raw_text: str, metadata: dict[str, Any]) -> tuple[float, float, list[Evidence]]:
    score = 0.03
    floor = 0.0
    evidence: list[Evidence] = []
    urls = extract_message_urls(raw_text, metadata)
    urgency = _matches(text, _URGENCY)
    action = _matches(text, _ACTION)
    sensitive = _sensitive_request(text)
    payment = _matches(text, _PAYMENT)
    delivery_debt = _matches(text, _SMS_DELIVERY_DEBT)
    job = _matches(text, _SMS_JOB)
    investment = _matches(text, _SMS_INVESTMENT)
    wrong_number = _matches(text, _SMS_WRONG_NUMBER)
    move_platform = _matches(text, _MOVE_PLATFORM)
    remote_app = _matches(text, _REMOTE_APP)
    reward = _matches(text, _REWARD)
    brand_claim = any(term in text for term in _BRANDS)

    if urls:
        score += 0.07
        evidence.append(_e(f"SMS chứa {len(urls)} liên kết; từng trang đích được chuyển sang bộ kiểm tra website.", Severity.MEDIUM, "S-WEB-link-present", 0.07))
    for url in urls[:5]:
        try:
            signals = analyze_url_signals(url)
        except ValueError:
            continue
        if signals.brand_mismatch or signals.homoglyph:
            score += 0.20
            evidence.append(_e("Liên kết có dấu hiệu giả chữ hoặc không khớp thương hiệu.", Severity.HIGH, "S-WEB-01", 0.20))
            break
    if metadata.get("malicious_url_confirmed"):
        floor = max(floor, 0.90)
        evidence.append(_e("Nguồn đối chứng uy tín xác nhận liên kết là lừa đảo hoặc phát tán mã độc.", Severity.CRITICAL, "S-WEB-confirmed", 0.24))
    if metadata.get("website_collects_sensitive") or metadata.get("website_forces_remote_app"):
        floor = max(floor, 0.90)
        evidence.append(_e("Trang cuối thu dữ liệu nhạy cảm hoặc ép cài ứng dụng nguy hiểm.", Severity.CRITICAL, "S-WEB-02", 0.24))

    if urgency:
        score += 0.05
        evidence.append(_e("Tin nhắn thúc ép bằng thời hạn hoặc hậu quả.", Severity.MEDIUM, "sms_urgency", 0.05))
    if sensitive:
        score += 0.22
        floor = max(floor, 0.85)
        evidence.append(_e("Tin nhắn yêu cầu gửi/nhập OTP, mã khôi phục, mật khẩu hoặc dữ liệu thẻ.", Severity.CRITICAL, "S-CONT-02", 0.22))
    if remote_app:
        score += 0.20
        floor = max(floor, 0.85)
        evidence.append(_e("Tin nhắn yêu cầu tải ứng dụng/APK hoặc công cụ điều khiển từ xa.", Severity.CRITICAL, "S-CONT-remote-app", 0.20))
    if delivery_debt and urls and (payment or action):
        score += 0.18
        evidence.append(_e("Kịch bản giao hàng/phạt/nợ yêu cầu mở link hoặc thanh toán bất ngờ.", Severity.HIGH, "S-CONT-01", 0.18))
    if brand_claim and urls and (payment or sensitive):
        floor = max(floor, 0.80)
        evidence.append(_e("Tự nhận tổ chức quen thuộc, kèm link và yêu cầu tiền/dữ liệu.", Severity.CRITICAL, "sms_brand_action_cluster", 0.16))
    if payment and re.search(r"(?:gift card|thẻ quà|bitcoin|usdt|crypto|tài khoản an toàn)", text, re.I):
        floor = max(floor, 0.85)
        score += 0.18
        evidence.append(_e("Yêu cầu chuyển tiền bằng phương thức khó thu hồi hoặc tới 'tài khoản an toàn'.", Severity.CRITICAL, "S-CONT-03", 0.18))
    elif payment:
        score += 0.09
        evidence.append(_e("Tin nhắn yêu cầu thanh toán hoặc chuyển tiền.", Severity.HIGH, "sms_payment_request", 0.09))
    if job and payment and re.search(r"(?:nhiệm vụ|hoa hồng|rút tiền|đơn hàng|nạp tiền)", text, re.I):
        floor = max(floor, 0.85)
        score += 0.20
        evidence.append(_e("Kịch bản việc làm/nhiệm vụ yêu cầu nạp tiền trước để nhận hoa hồng hoặc rút tiền.", Severity.CRITICAL, "S-CONT-04", 0.20))
    elif job:
        score += 0.08
        evidence.append(_e("Nội dung mời việc dễ hoặc làm nhiệm vụ nhận hoa hồng.", Severity.MEDIUM, "sms_job_lure", 0.08))
    if wrong_number and investment:
        floor = max(floor, 0.80)
        score += 0.18
        evidence.append(_e("Chuỗi làm quen/nhầm số đã chuyển sang mời đầu tư.", Severity.CRITICAL, "S-CONV-01", 0.18))
    elif investment:
        score += 0.10
        evidence.append(_e("Nội dung mời đầu tư hoặc hứa lợi nhuận.", Severity.HIGH, "sms_investment_lure", 0.10))
    if move_platform:
        score += 0.08
        evidence.append(_e("Yêu cầu chuyển cuộc trò chuyện sang nền tảng khác.", Severity.MEDIUM, "S-CONV-02", 0.08))
    if reward:
        score += 0.07
        evidence.append(_e("Tin nhắn dùng quà, hoàn tiền hoặc trúng thưởng làm mồi.", Severity.MEDIUM, "sms_reward_lure", 0.07))
    report_count = metadata.get("community_report_count", 0)
    try:
        report_count = max(0, int(report_count))
    except (TypeError, ValueError):
        report_count = 0
    if report_count >= 3:
        contribution = 0.10 if report_count >= 10 else 0.06
        score += contribution
        evidence.append(_e(f"Số/link/kịch bản trùng {report_count} báo cáo cộng đồng gần đây.", Severity.HIGH, "S-CAMPAIGN-community", contribution))
    if urgency and (sensitive or payment or remote_app):
        score += 0.10
        evidence.append(_e("Thúc ép kết hợp yêu cầu tiền/dữ liệu/cài ứng dụng là mẫu lừa đảo mạnh.", Severity.CRITICAL, "sms_social_engineering_cluster", 0.10))
    return score, floor, evidence


def assess_text_risk(
    text: str,
    modality: str = "email",
    metadata: dict | None = None,
    model_score: float | None = None,
    technical_signal: bool = False,
) -> TextRiskAssessment:
    """Assess one message using modality-specific evidence and mandatory floors."""

    metadata = dict(metadata or {})
    conversation = metadata.get("conversation_turns")
    conversation_text = ""
    if isinstance(conversation, list):
        conversation_text = "\n".join(str(item.get("text", "") if isinstance(item, dict) else item) for item in conversation[:50])
    normalized = normalize_for_detection("\n".join(item for item in (text or "", conversation_text) if item))
    selected = "sms" if modality == "sms" else "email"
    if selected == "sms":
        rule_score, floor, evidence = _sms_risk(normalized, text, metadata)
    else:
        rule_score, floor, evidence = _email_risk(normalized, text, metadata)

    # AI/ML is supporting evidence only: no independent rule signal means it cannot
    # turn a normal message into a high-risk result. With evidence it may add at most
    # ten points, matching the design's anti-false-positive constraint.
    raw_model = max(0.0, min(1.0, float(model_score or 0.0)))
    meaningful = any((item.contribution or 0) >= 0.05 for item in evidence)
    if technical_signal:
        combined = max(rule_score, raw_model)
    elif meaningful:
        combined = max(rule_score, min(raw_model, rule_score + 0.10))
    else:
        combined = max(rule_score, min(raw_model, 0.25))
    final = min(1.0, max(combined, floor))

    if not evidence and not technical_signal:
        evidence.append(_e("Chưa phát hiện tín hiệu lừa đảo rõ rệt trong dữ liệu đã cung cấp.", Severity.INFO, "no_text_signal", 0.0))
    return TextRiskAssessment(round(final, 4), evidence)
