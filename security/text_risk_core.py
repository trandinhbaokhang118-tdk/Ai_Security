"""Explainable phishing and scam core for email, SMS and plain text.

The core is deterministic and offline.  It complements ML with signals that a
bag-of-words model commonly misses: hidden HTML destinations, full URL risk,
sender/authentication alignment, dangerous attachments and multi-step scam lures.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from email.utils import parseaddr
from html.parser import HTMLParser
from typing import Any

from ai.adapters.text_adapter import fold_for_detection, strip_html
from ai.adapters.url_adapter import (
    ARCHIVE_EXTENSIONS,
    DANGEROUS_DOWNLOAD_EXTENSIONS,
    DOCUMENT_EXTENSIONS,
    parse_url_parts,
)
from security.url_risk_core import assess_url
from shared.constants import KNOWN_BRANDS
from shared.schemas import Evidence, Severity

_SCHEME_URL = re.compile(r"\b(?:https?://|www\.)[^\s<>\"']+", re.I)
_BARE_DOMAIN = re.compile(
    r"(?<!@)\b(?:[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?\.)+"
    r"[a-z]{2,24}(?:/[^\s<>\"']*)?",
    re.I,
)
_TRAILING_URL_PUNCTUATION = ".,;:!?)]}>\"'"

URGENCY = (
    "ngay",
    "gap",
    "khan cap",
    "het han",
    "dinh chi",
    "khoa",
    "tranh bi phat",
    "within",
    "urgent",
    "immediately",
    "suspended",
)
CREDENTIALS = (
    "mat khau",
    "password",
    "otp",
    "ma xac minh",
    "verification code",
    "cvv",
    "the tin dung",
    "seed phrase",
    "private key",
)
CREDENTIAL_REQUESTS = (
    "cung cap",
    "gui ma",
    "chia se ma",
    "nhap ma",
    "enter code",
    "provide",
    "send us",
    "reply with",
    "share your",
)
PROTECTIVE_OTP = (
    "khong chia se",
    "khong cung cap",
    "never share",
    "do not share",
    "we will never ask",
)
REWARDS = (
    "trung thuong",
    "nhan qua",
    "hoan tien",
    "uu dai",
    "gift",
    "prize",
    "reward",
    "refund",
    "hoa hong",
)
ACTION = (
    "bam",
    "nhap",
    "click",
    "truy cap",
    "xac minh",
    "verify",
    "dang nhap",
    "login",
    "cap nhat",
    "update",
    "thanh toan",
    "pay now",
)
PAYMENT = (
    "thanh toan",
    "dong phi",
    "nap tien",
    "chuyen khoan",
    "tai khoan ngan hang",
    "wire transfer",
    "bank transfer",
    "deposit",
    "gift card",
    "usdt",
)
DELIVERY = (
    "buu kien",
    "giao hang",
    "don hang",
    "hai quan",
    "parcel",
    "package",
    "redelivery",
    "delivery fee",
    "customs fee",
    "vnpost",
    "viettel post",
    "fedex",
    "dhl",
)
TOLL_OR_FINE = (
    "phi duong bo",
    "phi cao toc",
    "phi vetc",
    "phat nguoi",
    "bien lai phat",
    "unpaid toll",
    "toll fee",
    "traffic fine",
)
JOB_OR_TASK = (
    "viec lam online",
    "cong tac vien",
    "lam nhiem vu",
    "nhiem vu don hang",
    "task job",
    "online task",
    "hoa hong",
    "commission",
)
INVESTMENT = (
    "dau tu",
    "loi nhuan",
    "crypto",
    "tien ao",
    "forex",
    "usdt",
    "co phieu noi bo",
)
ACCOUNT_IDENTITY = (
    "tai khoan",
    "xac minh danh tinh",
    "dinh danh",
    "ekyc",
    "vneid",
    "account suspended",
    "account locked",
)
CHANNEL_MOVE = ("telegram", "whatsapp", "zalo", "signal app")
FINANCE_REQUEST = (
    "doi tai khoan ngan hang",
    "thay doi tai khoan ngan hang",
    "bank account change",
    "change banking details",
    "wire transfer",
    "invoice payment",
    "thanh toan hoa don",
    "chuyen khoan",
    "gift card",
)
AUTHORITY = ("ceo", "giam doc", "tong giam doc", "sep", "director", "executive")
SECRECY = ("giu bi mat", "bao mat", "khong noi voi ai", "confidential", "keep this secret")

PUBLIC_MAIL_DOMAINS = {
    "gmail.com",
    "googlemail.com",
    "hotmail.com",
    "outlook.com",
    "live.com",
    "yahoo.com",
    "icloud.com",
    "proton.me",
    "protonmail.com",
}
ACTIVE_ATTACHMENT_EXTENSIONS = set(DANGEROUS_DOWNLOAD_EXTENSIONS) | {
    "docm",
    "xlsm",
    "pptm",
    "xlam",
}


@dataclass(frozen=True)
class TextRiskAssessment:
    score: float
    evidence: list[Evidence]


@dataclass(frozen=True)
class _HTMLLink:
    href: str
    visible_text: str


class _LinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.links: list[_HTMLLink] = []
        self._anchors: list[dict[str, Any]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "a":
            return
        values = {key.lower(): value or "" for key, value in attrs}
        self._anchors.append({"href": values.get("href", ""), "text": []})

    def handle_data(self, data: str) -> None:
        if self._anchors:
            self._anchors[-1]["text"].append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "a" and self._anchors:
            anchor = self._anchors.pop()
            self.links.append(
                _HTMLLink(str(anchor["href"]).strip(), " ".join(anchor["text"]).strip())
            )

    def close(self) -> None:
        super().close()
        while self._anchors:
            anchor = self._anchors.pop()
            self.links.append(
                _HTMLLink(str(anchor["href"]).strip(), " ".join(anchor["text"]).strip())
            )


def _e(message: str, severity: Severity, feature: str, contribution: float) -> Evidence:
    return Evidence(
        source="text_risk_core",
        message=message,
        severity=severity,
        feature=feature,
        contribution=round(contribution, 3),
    )


def _refang(value: str) -> str:
    value = re.sub(r"\bhxxps://", "https://", value, flags=re.I)
    value = re.sub(r"\bhxxp://", "http://", value, flags=re.I)
    value = re.sub(r"\[(?:\.|dot)\]|\((?:\.|dot)\)|\{(?:\.|dot)\}", ".", value, flags=re.I)
    return value


def _extract_html_links(text: str) -> list[_HTMLLink]:
    parser = _LinkParser()
    try:
        parser.feed(text)
        parser.close()
    except (ValueError, TypeError):
        return parser.links
    return parser.links


def _extract_urls(text: str, html_links: list[_HTMLLink]) -> list[str]:
    refanged = _refang(text)
    urls: list[str] = []
    spans: list[tuple[int, int]] = []
    for match in _SCHEME_URL.finditer(refanged):
        urls.append(match.group(0).rstrip(_TRAILING_URL_PUNCTUATION))
        spans.append(match.span())
    masked = list(refanged)
    for start, end in spans:
        masked[start:end] = " " * (end - start)
    for match in _BARE_DOMAIN.finditer("".join(masked)):
        urls.append(match.group(0).rstrip(_TRAILING_URL_PUNCTUATION))
    for link in html_links:
        href = _refang(link.href).strip()
        if href.lower().startswith(("http://", "https://", "www.")):
            urls.append(href.rstrip(_TRAILING_URL_PUNCTUATION))

    deduplicated: list[str] = []
    seen: set[str] = set()
    for url in urls:
        key = url.casefold()
        if url and key not in seen:
            seen.add(key)
            deduplicated.append(url)
    return deduplicated[:8]


def _registrable_domain(value: str) -> str:
    try:
        return parse_url_parts(_refang(value)).registrable_domain
    except ValueError:
        return ""


def _displayed_domain(value: str) -> str:
    candidates = _extract_urls(value, [])
    return _registrable_domain(candidates[0]) if candidates else ""


def _hits(text: str, terms: tuple[str, ...]) -> list[str]:
    return [term for term in terms if term in text]


def _metadata_value(metadata: dict[str, Any], *names: str) -> Any:
    normalized = {str(key).lower().replace("-", "_"): value for key, value in metadata.items()}
    for name in names:
        value = normalized.get(name.lower().replace("-", "_"))
        if value not in (None, ""):
            return value
    return ""


def _mail_domain(value: Any) -> str:
    _, address = parseaddr(str(value or ""))
    if "@" not in address:
        return ""
    return address.rsplit("@", 1)[-1].strip(". ").lower()


def _organization_domain(domain: str) -> str:
    if not domain:
        return ""
    try:
        return parse_url_parts(domain).registrable_domain
    except ValueError:
        return domain


def _attachment_names(metadata: dict[str, Any]) -> list[str]:
    values: list[Any] = []
    for key in ("attachments", "attachment_names", "files"):
        item = _metadata_value(metadata, key)
        if isinstance(item, (list, tuple, set)):
            values.extend(item)
        elif item:
            values.append(item)
    names: list[str] = []
    for item in values:
        if isinstance(item, dict):
            name = item.get("filename") or item.get("name") or item.get("file_name")
        else:
            name = item
        if name:
            names.append(str(name).strip())
    return names


def _authentication_failures(metadata: dict[str, Any]) -> list[str]:
    statuses: dict[str, str] = {}
    nested = _metadata_value(metadata, "authentication_results", "auth_results")
    if isinstance(nested, dict):
        for mechanism in ("spf", "dkim", "dmarc"):
            if mechanism in nested:
                statuses[mechanism] = str(nested[mechanism]).lower()
    for mechanism in ("spf", "dkim", "dmarc"):
        direct = _metadata_value(metadata, mechanism, f"{mechanism}_result")
        if direct is False:
            statuses[mechanism] = "fail"
        elif direct:
            statuses[mechanism] = str(direct).lower()
    if isinstance(nested, str):
        for mechanism, status in re.findall(
            r"\b(spf|dkim|dmarc)\s*=\s*([a-z_-]+)", nested.lower()
        ):
            statuses[mechanism] = status
    failing = {"fail", "failed", "softfail", "permerror", "temperror"}
    return sorted(
        mechanism
        for mechanism, status in statuses.items()
        if status.strip().split()[0] in failing
    )


def _brand_mentioned(text: str) -> bool:
    for brand in KNOWN_BRANDS:
        if len(brand) <= 4:
            if re.search(rf"(?:^|\W){re.escape(brand)}(?:$|\W)", text):
                return True
        elif brand in text:
            return True
    return False


def _url_severity(score: float) -> Severity:
    if score >= 0.85:
        return Severity.CRITICAL
    if score >= 0.65:
        return Severity.HIGH
    if score >= 0.35:
        return Severity.MEDIUM
    return Severity.LOW


def assess_text_risk(
    text: str,
    modality: str = "email",
    metadata: dict | None = None,
    model_score: float | None = None,
) -> TextRiskAssessment:
    metadata = dict(metadata or {})
    html_links = _extract_html_links(text)
    urls = _extract_urls(text, html_links)
    visible_text = strip_html(text)
    subject = str(_metadata_value(metadata, "subject"))
    folded = fold_for_detection(f"{subject} {visible_text}")
    score = 0.03
    evidence: list[Evidence] = []

    urgency_hits = _hits(folded, URGENCY)
    credential_hits = _hits(folded, CREDENTIALS)
    action_hits = _hits(folded, ACTION)
    reward_hits = _hits(folded, REWARDS)
    protective_otp = bool(_hits(folded, PROTECTIVE_OTP)) and not urls
    safe_otp_context = (
        modality == "sms"
        and protective_otp
        and not reward_hits
        and not _hits(folded, PAYMENT)
        and not _hits(folded, DELIVERY + TOLL_OR_FINE + JOB_OR_TASK + INVESTMENT)
    )
    credential_request = bool(credential_hits) and not protective_otp and bool(
        urls or action_hits or _hits(folded, CREDENTIAL_REQUESTS)
    )

    if urgency_hits:
        contribution = min(0.18, 0.06 * len(urgency_hits))
        score += contribution
        evidence.append(
            _e(
                "Ngôn ngữ thúc ép hoặc tạo thời hạn ngắn: "
                + ", ".join(urgency_hits[:3]),
                Severity.MEDIUM,
                "urgency_pressure",
                contribution,
            )
        )
    if credential_request:
        contribution = min(0.30, 0.12 * len(credential_hits))
        score += contribution
        evidence.append(
            _e(
                "Nội dung yêu cầu dữ liệu xác thực/nhạy cảm: "
                + ", ".join(credential_hits[:3]),
                Severity.HIGH,
                "credential_request",
                contribution,
            )
        )
    if reward_hits:
        score += 0.10
        evidence.append(
            _e(
                "Nội dung dùng mồi quà tặng, hoàn tiền, trúng thưởng hoặc hoa hồng.",
                Severity.MEDIUM,
                "reward_lure",
                0.10,
            )
        )
    if urgency_hits and credential_request and action_hits:
        score += 0.24
        evidence.append(
            _e(
                "Kết hợp thúc ép, yêu cầu thông tin nhạy cảm và kêu gọi hành động.",
                Severity.CRITICAL,
                "social_engineering_cluster",
                0.24,
            )
        )
    if safe_otp_context:
        evidence.append(
            _e(
                "SMS chỉ cung cấp OTP và dặn không chia sẻ, không kèm liên kết hay mồi thanh toán.",
                Severity.INFO,
                "protective_otp_context",
                0.0,
            )
        )

    for link in html_links:
        href_domain = _registrable_domain(link.href)
        displayed_domain = _displayed_domain(link.visible_text)
        if displayed_domain and href_domain and displayed_domain != href_domain:
            score += 0.82
            evidence.append(
                _e(
                    f"Liên kết hiển thị {displayed_domain} nhưng thực tế trỏ tới "
                    f"{href_domain}.",
                    Severity.CRITICAL,
                    "display_href_domain_mismatch",
                    0.82,
                )
            )
        if link.href.strip().lower().startswith(("javascript:", "data:")):
            score += 0.52
            evidence.append(
                _e(
                    "Liên kết email dùng đích script/data thay vì trang web thông thường.",
                    Severity.HIGH,
                    "active_html_link",
                    0.52,
                )
            )

    for url in urls:
        try:
            url_result = assess_url(url)
        except (ValueError, TypeError):
            score += 0.08
            evidence.append(
                _e(
                    "Liên kết trong nội dung có định dạng bất thường.",
                    Severity.LOW,
                    "malformed_embedded_url",
                    0.08,
                )
            )
            continue
        if url_result.score <= 0:
            continue
        score = max(score, url_result.score)
        domain = _registrable_domain(url) or "không xác định"
        evidence.append(
            _e(
                f"Liên kết nhúng tới {domain} có điểm rủi ro URL "
                f"{url_result.score:.2f}.",
                _url_severity(url_result.score),
                "embedded_url_risk",
                url_result.score,
            )
        )
        for item in (
            candidate
            for candidate in url_result.evidence
            if candidate.severity != Severity.INFO
        ):
            evidence.append(
                Evidence(
                    source="embedded_url",
                    message=f"Liên kết nhúng: {item.message}",
                    severity=item.severity,
                    feature=f"embedded_{item.feature}" if item.feature else "embedded_url_signal",
                    contribution=0.0,
                )
            )

    if modality == "sms":
        delivery_hits = _hits(folded, DELIVERY)
        toll_hits = _hits(folded, TOLL_OR_FINE)
        job_hits = _hits(folded, JOB_OR_TASK)
        investment_hits = _hits(folded, INVESTMENT)
        payment_hits = _hits(folded, PAYMENT)
        account_hits = _hits(folded, ACCOUNT_IDENTITY)
        channel_hits = _hits(folded, CHANNEL_MOVE)

        if urls and payment_hits and (delivery_hits or toll_hits):
            score += 0.72
            evidence.append(
                _e(
                    "SMS giả giao hàng/phí đường bộ kết hợp đường dẫn và yêu cầu thanh toán.",
                    Severity.CRITICAL,
                    "sms_delivery_toll_payment_cluster",
                    0.72,
                )
            )
        elif payment_hits and (delivery_hits or toll_hits):
            score += 0.42
            evidence.append(
                _e(
                    "SMS yêu cầu nộp phí liên quan giao hàng hoặc đường bộ.",
                    Severity.HIGH,
                    "sms_delivery_toll_lure",
                    0.42,
                )
            )
        if payment_hits and (job_hits or investment_hits):
            score += 0.70
            evidence.append(
                _e(
                    "Mời việc làm/đầu tư nhưng yêu cầu nạp tiền hoặc chuyển tài sản trước.",
                    Severity.CRITICAL,
                    "sms_task_investment_deposit_cluster",
                    0.70,
                )
            )
        elif channel_hits and (job_hits or investment_hits or reward_hits):
            score += 0.46
            evidence.append(
                _e(
                    "Lời mời kiếm tiền chuyển sang kênh nhắn tin riêng.",
                    Severity.HIGH,
                    "sms_channel_migration_lure",
                    0.46,
                )
            )
        if urls and account_hits and (action_hits or credential_request or urgency_hits):
            score += 0.64
            evidence.append(
                _e(
                    "SMS cảnh báo tài khoản/danh tính kèm đường dẫn yêu cầu xử lý.",
                    Severity.CRITICAL,
                    "sms_account_takeover_cluster",
                    0.64,
                )
            )
        if urls and credential_request:
            score += 0.12
            evidence.append(
                _e(
                    "SMS chứa liên kết và yêu cầu thông tin xác thực.",
                    Severity.HIGH,
                    "sms_smishing_pattern",
                    0.12,
                )
            )

    if modality == "email":
        sender = _metadata_value(metadata, "sender", "from", "from_address")
        reply_to = _metadata_value(metadata, "reply_to", "replyto")
        sender_domain = _mail_domain(sender)
        reply_domain = _mail_domain(reply_to)
        sender_identity = fold_for_detection(f"{sender} {subject}")

        sender_brand_mismatch = (
            sender_domain in PUBLIC_MAIL_DOMAINS and _brand_mentioned(sender_identity)
        )
        if sender_brand_mismatch:
            score += 0.32
            evidence.append(
                _e(
                    "Tên người gửi/chủ đề mang thương hiệu nhưng dùng hộp thư công cộng.",
                    Severity.HIGH,
                    "sender_brand_mismatch",
                    0.32,
                )
            )
        sender_org = _organization_domain(sender_domain)
        reply_org = _organization_domain(reply_domain)
        if sender_org and reply_org and sender_org != reply_org:
            score += 0.18
            evidence.append(
                _e(
                    f"Reply-To ({reply_org}) khác miền tổ chức của người gửi ({sender_org}).",
                    Severity.HIGH,
                    "reply_to_domain_mismatch",
                    0.18,
                )
            )

        auth_failures = _authentication_failures(metadata)
        if auth_failures:
            contribution = 0.32 if len(auth_failures) >= 2 else (
                0.22 if "dmarc" in auth_failures else 0.12
            )
            score += contribution
            evidence.append(
                _e(
                    "Email báo lỗi xác thực người gửi: " + ", ".join(auth_failures) + ".",
                    Severity.HIGH if len(auth_failures) >= 2 else Severity.MEDIUM,
                    "email_authentication_failure",
                    contribution,
                )
            )
        if sender_brand_mismatch and auth_failures:
            score += 0.36
            evidence.append(
                _e(
                    "Mạo danh thương hiệu từ hộp thư công cộng đồng thời thất bại xác thực email.",
                    Severity.CRITICAL,
                    "email_sender_spoofing_cluster",
                    0.36,
                )
            )

        finance_hits = _hits(folded, FINANCE_REQUEST)
        authority_hits = _hits(folded, AUTHORITY)
        secrecy_hits = _hits(folded, SECRECY)
        if finance_hits and (authority_hits or secrecy_hits or urgency_hits):
            score += 0.62
            evidence.append(
                _e(
                    "Mẫu BEC: yêu cầu tài chính đi kèm mạo danh lãnh đạo, bí mật hoặc thúc ép.",
                    Severity.CRITICAL,
                    "business_email_compromise_cluster",
                    0.62,
                )
            )

        for filename in _attachment_names(metadata):
            parts = [part.lower() for part in filename.rsplit("/", 1)[-1].split(".") if part]
            final_extension = parts[-1] if len(parts) >= 2 else ""
            previous_extension = parts[-2] if len(parts) >= 3 else ""
            disguised = (
                final_extension in ACTIVE_ATTACHMENT_EXTENSIONS
                and previous_extension in DOCUMENT_EXTENSIONS
            )
            if disguised:
                score += 0.82
                evidence.append(
                    _e(
                        f"Tệp đính kèm {filename!r} dùng đuôi tài liệu giả trước đuôi thực thi.",
                        Severity.CRITICAL,
                        "disguised_executable_attachment",
                        0.82,
                    )
                )
            elif final_extension in ACTIVE_ATTACHMENT_EXTENSIONS:
                score += 0.50
                evidence.append(
                    _e(
                        f"Tệp đính kèm {filename!r} có thể thực thi hoặc chứa macro chủ động.",
                        Severity.HIGH,
                        "active_attachment",
                        0.50,
                    )
                )
            elif final_extension in ARCHIVE_EXTENSIONS and (
                "invoice" in folded or "hoa don" in folded or "cv" in folded
            ):
                score += 0.24
                evidence.append(
                    _e(
                        f"Tệp nén {filename!r} đi kèm mồi hóa đơn/CV.",
                        Severity.HIGH,
                        "archive_attachment_lure",
                        0.24,
                    )
                )

    model_value = float(model_score or 0.0)
    if safe_otp_context:
        # The current lightweight corpus over-weights the token "OTP".  A
        # protective, link-free OTP notification is a narrow deterministic benign
        # pattern, so an uncorroborated model score cannot promote it to phishing.
        model_value = min(model_value, 0.15)
    final = min(1.0, max(score, model_value))
    if not evidence:
        evidence.append(
            _e(
                "Không phát hiện tín hiệu lừa đảo rõ rệt trong nội dung ngoại tuyến.",
                Severity.INFO,
                "no_text_signal",
                0.0,
            )
        )
    return TextRiskAssessment(final, evidence)
