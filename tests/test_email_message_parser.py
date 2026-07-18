from __future__ import annotations

import io
import zipfile
from email.message import EmailMessage

from backend.dependencies import get_inference_service
from backend.services import inference_service as inference_module
from security.attachment_security import MalwareScanResult
from security.email_message_parser import parse_email_bytes, safe_email_preview


def _sample_email(*, with_attachment: bool = True) -> bytes:
    message = EmailMessage()
    message["From"] = "Microsoft Security <alert@unknown.example>"
    message["Reply-To"] = "collect@other.example"
    message["Return-Path"] = "bounce@unknown.example"
    message["To"] = "user@example.com"
    message["Subject"] = "Urgent account verification"
    message["Message-ID"] = "<sample@example.com>"
    message["Authentication-Results"] = "mx.example; spf=fail; dkim=fail; dmarc=fail"
    message.set_content("Please verify your account immediately.")
    message.add_alternative(
        '<p>Please verify.</p><a href="http://micr0soft-login.example/verify">https://microsoft.com</a>',
        subtype="html",
    )
    if with_attachment:
        message.add_attachment(
            b"MZ" + b"\0" * 100,
            maintype="application",
            subtype="octet-stream",
            filename="invoice.pdf.exe",
        )
    return message.as_bytes()


def test_parse_eml_extracts_headers_auth_hidden_links_and_attachments() -> None:
    parsed = parse_email_bytes(_sample_email(), "sample.eml")

    assert parsed.metadata["authentication"] == {
        "spf": "fail",
        "dkim": "fail",
        "dmarc": "fail",
    }
    assert parsed.metadata["display_link_mismatches"]
    assert "http://micr0soft-login.example/verify" in parsed.metadata["attachment_urls"] or "micr0soft-login.example" in parsed.metadata["raw_html"]
    assert parsed.attachments[0].metadata["detected_type"] == "application/x-dosexec"
    assert parsed.coverage["mime_parse"] == "completed"


def test_safe_email_preview_strips_active_html_and_neutralizes_links() -> None:
    preview = safe_email_preview(
        '<style>body{display:none}</style><p>Hello <a href="https://evil.example/x">'
        'https://bank.example/login</a></p><script>alert(1)</script>'
        '<img src="https://tracker.example/pixel">',
        is_html=True,
    )

    assert "Hello" in preview
    assert "body{" not in preview
    assert "alert(1)" not in preview
    assert "https://" not in preview
    assert "[LIÊN KẾT ĐÃ KHỬ]" in preview


def test_assess_email_bytes_returns_coverage_and_attachment_evidence() -> None:
    service = get_inference_service()
    response = service.assess_email_bytes(_sample_email(), "sample.eml")

    assert response.risk_score >= 0.70
    assert response.analysis_coverage["email_headers"] == "completed"
    assert response.analysis_coverage["authentication_results"] == "completed"
    assert response.message_metadata["attachment_count"] == 1
    assert any("email_attachment_1" in item.source for item in response.evidence)


def test_confirmed_attachment_signature_sets_critical_floor(monkeypatch) -> None:
    monkeypatch.setattr(
        inference_module,
        "scan_clamav_bytes",
        lambda *_args, **_kwargs: MalwareScanResult(
            "completed", malicious=True, signature="Unit.Test.Signature"
        ),
    )
    response = get_inference_service().assess_email_bytes(_sample_email(), "sample.eml")

    assert response.analysis_coverage["malware_signature_scan"] == "completed"
    assert response.risk_score >= 0.95
    assert response.message_metadata["attachments"][0]["malware_signature"] == "Unit.Test.Signature"


def test_no_attachment_marks_attachment_only_checks_not_applicable() -> None:
    parsed = parse_email_bytes(_sample_email(with_attachment=False), "sample.eml")

    assert parsed.coverage["malware_signature_scan"] == "not_applicable"
    assert parsed.coverage["attachment_sandbox"] == "not_applicable"
    assert parsed.coverage["ocr"] == "not_applicable"


def test_office_macro_and_external_link_are_extracted_without_execution() -> None:
    archive = io.BytesIO()
    with zipfile.ZipFile(archive, "w") as package:
        package.writestr("word/vbaProject.bin", b"macro")
        package.writestr(
            "word/_rels/document.xml.rels",
            b'<Relationship Target="https://login-example.test/collect"/>',
        )
    message = EmailMessage()
    message["From"] = "sender@example.com"
    message["To"] = "user@example.com"
    message["Subject"] = "Document"
    message.set_content("Please open the document")
    message.add_attachment(
        archive.getvalue(),
        maintype="application",
        subtype="vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename="document.docm",
    )

    parsed = parse_email_bytes(message.as_bytes())

    assert parsed.attachments[0].metadata["contains_macro"] is True
    assert "https://login-example.test/collect" in parsed.metadata["attachment_urls"]
    assert parsed.coverage["attachment_static_scan"] == "completed"
