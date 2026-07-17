from types import SimpleNamespace

from backend.routers.integrations import _extract_url, _format_result


def test_extract_url_from_telegram_text():
    assert _extract_url("kiểm tra https://example.test/login?x=1.") == "https://example.test/login?x=1"
    assert _extract_url("không có liên kết") == ""


def test_format_result_marks_high_risk_url():
    result = SimpleNamespace(
        final_score=0.91,
        risk_score=0.91,
        decision=SimpleNamespace(value="block"),
        reasons=["Tên miền giả mạo thương hiệu"],
    )

    text = _format_result("https://evil.test/login", result)

    assert "❌" in text
    assert "91.0%" in text
    assert "Tên miền giả mạo" in text
