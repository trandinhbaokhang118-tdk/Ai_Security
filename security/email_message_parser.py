"""Bounded RFC822/MIME parser for production email assessment.

Parsing is deliberately offline: no attachment is executed and archive/PDF/image
inspection has strict size/count limits. The result carries coverage states so an
unavailable QR/OCR dependency can never be mistaken for a clean check.
"""
from __future__ import annotations

import hashlib
import io
import re
import zipfile
from dataclasses import dataclass, field
from email import policy
from email.message import Message
from email.parser import BytesParser
from html.parser import HTMLParser
from pathlib import PurePath
from typing import Any
from urllib.parse import urlsplit

from ai.adapters.text_adapter import extract_message_urls

_MAX_PARTS = 150
_MAX_BODY_CHARS = 100_000
_MAX_ATTACHMENT_INSPECT_BYTES = 8 * 1024 * 1024
_MAX_ARCHIVE_ENTRIES = 40
_MAX_ARCHIVE_TEXT_BYTES = 2 * 1024 * 1024
_URL_BYTES = re.compile(rb"https?://[^\s<>\"']{4,2048}", re.I)


@dataclass
class ParsedAttachment:
    filename: str
    content_type: str
    data: bytes
    metadata: dict[str, Any]
    urls: list[str] = field(default_factory=list)
    qr_urls: list[str] = field(default_factory=list)


@dataclass
class ParsedEmail:
    body: str
    metadata: dict[str, Any]
    attachments: list[ParsedAttachment]
    coverage: dict[str, str]


class _AnchorParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._href = ""
        self._text: list[str] = []
        self.links: list[tuple[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() == "a":
            self._href = str(dict(attrs).get("href") or "").strip()
            self._text = []

    def handle_data(self, data: str) -> None:
        if self._href:
            self._text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "a" and self._href:
            self.links.append((" ".join(self._text).strip(), self._href))
            self._href = ""
            self._text = []


class _SafePreviewParser(HTMLParser):
    """Extract visible text without preserving active or remote HTML content."""

    _BLOCK_TAGS = {
        "address", "article", "aside", "blockquote", "br", "div", "footer",
        "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "li", "main",
        "nav", "ol", "p", "pre", "section", "table", "td", "th", "tr", "ul",
    }
    _IGNORED_TAGS = {"script", "style", "svg", "template", "noscript"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._ignored_depth = 0
        self._parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        normalized = tag.lower()
        if normalized in self._IGNORED_TAGS:
            self._ignored_depth += 1
        elif not self._ignored_depth and normalized in self._BLOCK_TAGS:
            self._parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        normalized = tag.lower()
        if normalized in self._IGNORED_TAGS and self._ignored_depth:
            self._ignored_depth -= 1
        elif not self._ignored_depth and normalized in self._BLOCK_TAGS:
            self._parts.append("\n")

    def handle_data(self, data: str) -> None:
        if not self._ignored_depth:
            self._parts.append(data)

    def text(self) -> str:
        return "".join(self._parts)


def safe_email_preview(body: str, *, is_html: bool = False, limit: int = 40_000) -> str:
    """Return bounded inert text suitable for a desktop preview pane."""

    text = body
    if is_html:
        parser = _SafePreviewParser()
        try:
            parser.feed(body)
            text = parser.text()
        except Exception:
            text = re.sub(r"<[^>]{0,500}>", " ", body)
    text = re.sub(r"https?://[^\s<>\"']+", "[LIÊN KẾT ĐÃ KHỬ]", text, flags=re.I)
    text = re.sub(r"\bwww\.[^\s<>\"']+", "[LIÊN KẾT ĐÃ KHỬ]", text, flags=re.I)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n[ \t]+", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()[: max(1, min(limit, 40_000))]


def _decode_part(part: Message, limit: int = _MAX_BODY_CHARS) -> str:
    try:
        value = part.get_content()
        if isinstance(value, str):
            return value[:limit]
    except Exception:
        pass
    payload = part.get_payload(decode=True) or b""
    charset = part.get_content_charset() or "utf-8"
    try:
        return payload.decode(charset, errors="replace")[:limit]
    except LookupError:
        return payload.decode("utf-8", errors="replace")[:limit]


def _magic_type(data: bytes) -> str:
    if data.startswith(b"MZ"):
        return "application/x-dosexec"
    if data.startswith(b"%PDF-"):
        return "application/pdf"
    if data.startswith(b"PK\x03\x04"):
        return "application/zip"
    if data.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"):
        return "application/x-ole-storage"
    if data.startswith(b"L\x00\x00\x00\x01\x14\x02\x00"):
        return "application/x-ms-shortcut"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith((b"GIF87a", b"GIF89a")):
        return "image/gif"
    if data.startswith(b"Rar!\x1a\x07"):
        return "application/vnd.rar"
    if data.lstrip().lower().startswith((b"<html", b"<!doctype html")):
        return "text/html"
    return "application/octet-stream"


def _extension_expected_type(filename: str) -> set[str]:
    suffix = PurePath(filename.lower()).suffix
    return {
        ".pdf": {"application/pdf"},
        ".png": {"image/png"},
        ".jpg": {"image/jpeg"},
        ".jpeg": {"image/jpeg"},
        ".gif": {"image/gif"},
        ".zip": {"application/zip"},
        ".docx": {"application/zip"},
        ".xlsx": {"application/zip"},
        ".pptx": {"application/zip"},
        ".exe": {"application/x-dosexec"},
        ".html": {"text/html"},
        ".htm": {"text/html"},
    }.get(suffix, set())


def _archive_inspection(data: bytes) -> tuple[list[str], list[str], dict[str, bool]]:
    if len(data) > _MAX_ATTACHMENT_INSPECT_BYTES:
        return [], [], {"archive_encrypted": False, "contains_macro": False}
    found: list[str] = []
    qr_urls: list[str] = []
    flags = {"archive_encrypted": False, "contains_macro": False}
    total = 0
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            infos = archive.infolist()
            if len(infos) > _MAX_ARCHIVE_ENTRIES:
                return [], [], flags
            for info in infos:
                flags["archive_encrypted"] = flags["archive_encrypted"] or bool(info.flag_bits & 0x1)
                normalized_name = info.filename.replace("\\", "/").lower()
                flags["contains_macro"] = flags["contains_macro"] or normalized_name.endswith(
                    ("vbaproject.bin", "vba.bin")
                )
                if info.is_dir() or info.file_size > 512_000:
                    continue
                total += info.file_size
                if total > _MAX_ARCHIVE_TEXT_BYTES:
                    break
                if normalized_name.endswith((".png", ".jpg", ".jpeg", ".gif")):
                    try:
                        decoded, _ = _decode_qr(archive.read(info))
                        qr_urls.extend(
                            url for value in decoded for url in extract_message_urls(value)
                        )
                    except (OSError, RuntimeError, ValueError, zipfile.BadZipFile):
                        pass
                    continue
                if not info.filename.lower().endswith((".xml", ".rels", ".txt", ".html", ".htm")):
                    continue
                payload = archive.read(info)
                found.extend(match.decode("utf-8", errors="ignore") for match in _URL_BYTES.findall(payload))
    except (OSError, ValueError, zipfile.BadZipFile, RuntimeError):
        return [], [], flags
    return (
        list(dict.fromkeys(found))[:30],
        list(dict.fromkeys(qr_urls))[:20],
        flags,
    )


def _pdf_urls(data: bytes) -> tuple[list[str], bool]:
    try:
        from pypdf import PdfReader
    except ImportError:
        return [], False
    if len(data) > _MAX_ATTACHMENT_INSPECT_BYTES:
        return [], True
    try:
        reader = PdfReader(io.BytesIO(data), strict=False)
        text = " ".join((page.extract_text() or "")[:50_000] for page in reader.pages[:10])
        return extract_message_urls(text), True
    except Exception:
        return [], True


def _decode_qr(data: bytes) -> tuple[list[str], bool]:
    try:
        import cv2
        import numpy as np
    except ImportError:
        return [], False
    if len(data) > _MAX_ATTACHMENT_INSPECT_BYTES:
        return [], True
    try:
        image = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
        if image is None:
            return [], True
        detector = cv2.QRCodeDetector()
        values: list[str] = []
        if hasattr(detector, "detectAndDecodeMulti"):
            ok, decoded, _, _ = detector.detectAndDecodeMulti(image)
            if ok:
                values.extend(str(item) for item in decoded if item)
        if not values:
            value, _, _ = detector.detectAndDecode(image)
            if value:
                values.append(value)
        return [item for item in values if extract_message_urls(item)], True
    except Exception:
        return [], True


def _auth_results(message: Message) -> dict[str, str]:
    output: dict[str, str] = {}
    headers = message.get_all("Authentication-Results", []) or []
    for header in headers:
        for mechanism, result in re.findall(
            r"\b(spf|dkim|dmarc)\s*=\s*(pass|fail|softfail|neutral|none|temperror|permerror)",
            str(header),
            re.I,
        ):
            output.setdefault(mechanism.lower(), result.lower())
    if "spf" not in output:
        received_spf = str(message.get("Received-SPF", ""))
        match = re.match(r"\s*(pass|fail|softfail|neutral|none|temperror|permerror)", received_spf, re.I)
        if match:
            output["spf"] = match.group(1).lower()
    return output


def _display_link_mismatches(html: str) -> list[dict[str, str]]:
    parser = _AnchorParser()
    try:
        parser.feed(html)
    except Exception:
        return []
    output: list[dict[str, str]] = []
    for visible, target in parser.links[:100]:
        visible_urls = extract_message_urls(visible)
        target_urls = extract_message_urls(target)
        visible_host = ""
        if visible_urls:
            visible_host = (urlsplit(visible_urls[0]).hostname or "").lower()
        else:
            visible_match = re.search(
                r"(?<![@\w])(?:www\.)?([a-z0-9](?:[a-z0-9-]{0,62}\.)+[a-z]{2,24})(?![\w])",
                visible,
                re.I,
            )
            if visible_match:
                visible_host = visible_match.group(1).lower()
        if not visible_host or not target_urls:
            continue
        left = visible_host
        right = (urlsplit(target_urls[0]).hostname or "").lower()
        if left and right and left != right and not left.endswith("." + right) and not right.endswith("." + left):
            output.append({"displayed": visible, "target": target_urls[0]})
    return output[:20]


def parse_email_bytes(data: bytes, filename: str = "message.eml") -> ParsedEmail:
    if not data:
        raise ValueError("Email file is empty")
    try:
        message = BytesParser(policy=policy.default).parsebytes(data)
    except Exception as exc:
        raise ValueError("Cannot parse RFC822/MIME email") from exc

    plain_parts: list[str] = []
    html_parts: list[str] = []
    attachments: list[ParsedAttachment] = []
    part_count = 0
    qr_available: bool | None = None
    pdf_available: bool | None = None

    for part in message.walk():
        part_count += 1
        if part_count > _MAX_PARTS:
            break
        if part.is_multipart():
            continue
        disposition = part.get_content_disposition()
        content_type = part.get_content_type().lower()
        filename_value = str(part.get_filename() or "")
        # Inline images may contain the only phishing content or a QR code. They
        # are inspected locally but remote images are never fetched.
        is_attachment = (
            disposition == "attachment"
            or bool(filename_value)
            or (disposition == "inline" and content_type.startswith("image/"))
        )
        if not is_attachment and content_type == "text/plain":
            plain_parts.append(_decode_part(part))
            continue
        if not is_attachment and content_type == "text/html":
            html_parts.append(_decode_part(part))
            continue
        if not is_attachment:
            continue

        payload = (part.get_payload(decode=True) or b"")[:_MAX_ATTACHMENT_INSPECT_BYTES]
        detected = _magic_type(payload)
        expected = _extension_expected_type(filename_value)
        type_mismatch = bool(expected and detected not in expected)
        urls: list[str] = []
        archive_qr_urls: list[str] = []
        archive_flags = {"archive_encrypted": False, "contains_macro": False}
        if content_type.startswith("text/") or detected == "text/html":
            urls = extract_message_urls(_decode_part(part, 50_000))
        elif detected == "application/zip":
            urls, archive_qr_urls, archive_flags = _archive_inspection(payload)
        elif detected == "application/pdf":
            urls, pdf_ready = _pdf_urls(payload)
            pdf_available = pdf_ready if pdf_available is None else pdf_available or pdf_ready
        qr_urls: list[str] = list(archive_qr_urls)
        if detected.startswith("image/"):
            decoded, qr_ready = _decode_qr(payload)
            qr_available = qr_ready if qr_available is None else qr_available or qr_ready
            qr_urls = [url for value in decoded for url in extract_message_urls(value)]
        suffixes = re.findall(r"\.[a-z0-9]{1,8}", filename_value.lower())
        attachments.append(
            ParsedAttachment(
                filename=filename_value or f"part-{part_count}",
                content_type=content_type,
                data=payload,
                urls=list(dict.fromkeys(urls))[:30],
                qr_urls=list(dict.fromkeys(qr_urls))[:20],
                metadata={
                    "filename": filename_value or f"part-{part_count}",
                    "mime_type": content_type,
                    "detected_type": detected,
                    "type_mismatch": type_mismatch,
                    "double_extension": len(suffixes) >= 2,
                    "dangerous_extension": bool(
                        suffixes
                        and suffixes[-1]
                        in {
                            ".apk", ".bat", ".cmd", ".com", ".exe", ".hta",
                            ".iso", ".js", ".lnk", ".msi", ".ps1", ".scr",
                            ".svg", ".vbs", ".wsf",
                        }
                    ),
                    "archive_encrypted": archive_flags["archive_encrypted"],
                    "contains_macro": archive_flags["contains_macro"],
                    "active_pdf_content": bool(
                        detected == "application/pdf"
                        and re.search(rb"/(?:JavaScript|JS|OpenAction|Launch)\b", payload, re.I)
                    ),
                    "size_bytes": len(payload),
                    "sha256": hashlib.sha256(payload).hexdigest(),
                },
            )
        )

    plain = "\n".join(item for item in plain_parts if item).strip()
    html = "\n".join(item for item in html_parts if item).strip()
    body = plain or html
    auth = _auth_results(message)
    attachment_urls = [url for item in attachments for url in item.urls]
    qr_urls = [url for item in attachments for url in item.qr_urls]
    has_images = any(item.metadata.get("detected_type", "").startswith("image/") for item in attachments)
    has_executable = any(
        item.metadata.get("detected_type") == "application/x-dosexec"
        or item.metadata.get("dangerous_extension")
        for item in attachments
    )
    metadata: dict[str, Any] = {
        "source": "eml_upload",
        "filename": filename,
        "sender": str(message.get("From", "")),
        "from": str(message.get("From", "")),
        "reply_to": str(message.get("Reply-To", "")),
        "return_path": str(message.get("Return-Path", "")),
        "subject": str(message.get("Subject", "")),
        "message_id": str(message.get("Message-ID", "")),
        "date": str(message.get("Date", "")),
        "received_hops": [str(item)[:1000] for item in (message.get_all("Received", []) or [])[:20]],
        "authentication": auth,
        "forwarded": bool(message.get("ARC-Seal") or message.get("Resent-From") or message.get("X-Forwarded-To")),
        "raw_html": html[:_MAX_BODY_CHARS],
        "display_link_mismatches": _display_link_mismatches(html),
        "attachment_urls": list(dict.fromkeys(attachment_urls))[:50],
        "qr_urls": list(dict.fromkeys(qr_urls))[:30],
        "attachments": [item.metadata for item in attachments],
    }
    coverage = {
        "mime_parse": "completed",
        "email_headers": "completed",
        "authentication_results": "completed" if auth else "unavailable",
        "attachments": "completed",
        "attachment_url_extraction": "completed",
        "attachment_static_scan": "completed",
        "malware_signature_scan": "unavailable" if attachments else "not_applicable",
        "attachment_sandbox": "unavailable" if has_executable else "not_applicable",
        "pdf_text": "completed" if pdf_available else ("not_applicable" if pdf_available is None else "unavailable"),
        "qr_decode": "completed" if qr_available else ("not_applicable" if qr_available is None else "unavailable"),
        "ocr": "unavailable" if has_images else "not_applicable",
        "gmail_context": "not_applicable",
    }
    return ParsedEmail(body=body[:_MAX_BODY_CHARS], metadata=metadata, attachments=attachments, coverage=coverage)
