from __future__ import annotations

from ai.adapters.text_adapter import extract_message_urls, preprocess_email
from ai.inference.engine import PredictionResult
from backend.services.inference_service import InferenceService
from security.text_risk_core import assess_text_risk
from shared.schemas import Evidence, Severity


def features(result) -> set[str]:
    return {item.feature or "" for item in result.evidence}


def test_clean_email_is_not_promoted_by_an_uncalibrated_model() -> None:
    result = assess_text_risk(
        "Chào anh, lịch họp nội bộ chuyển sang 14h chiều mai.",
        "email",
        {"sender": "Lan <lan@company.vn>", "subject": "Lịch họp dự án"},
        model_score=0.95,
    )
    assert result.score <= 0.25
    assert features(result) == {"no_text_signal"}


def test_email_bec_combination_applies_mandatory_floor() -> None:
    result = assess_text_risk(
        "Tôi là giám đốc. Hãy giữ bí mật, thay đổi số tài khoản thanh toán mới "
        "và chuyển khoản gấp hôm nay.",
        "email",
    )
    assert result.score >= 0.85
    assert "E-BEC-02" in features(result)


def test_email_authentication_failure_needs_impersonation_and_action_for_floor() -> None:
    risky = assess_text_risk(
        "Ngân hàng yêu cầu đăng nhập và nhập mật khẩu để thanh toán.",
        "email",
        {"sender": "Ngân hàng <alert@unknown.example>", "dmarc": "fail"},
    )
    technical_only = assess_text_risk(
        "Bản tin kỹ thuật tháng này.",
        "email",
        {"sender": "News <news@example.com>", "dmarc": "fail", "forwarded": True},
    )
    assert risky.score >= 0.85
    assert technical_only.score < 0.40


def test_account_lock_shortlink_email_is_suspicious() -> None:
    result = assess_text_risk(
        "Tài khoản của bạn bị khóa, nhấn vào đây để xác minh ngay: http://bit.ly/xxx",
        "email",
    )
    assert result.score > 0.40
    assert "email_account_takeover_cluster" in features(result)


def test_hidden_html_href_is_preserved_for_url_analysis() -> None:
    raw = '<a href="http://paypa1-login.example/verify">https://paypal.com</a>'
    assert set(extract_message_urls(raw)) == {
        "https://paypal.com",
        "http://paypa1-login.example/verify",
    }
    clean = preprocess_email(raw)
    assert "paypa1-login.example" in clean
    result = assess_text_risk(clean, "email")
    assert "E-WEB-01" in features(result)


def test_legitimate_otp_warning_is_not_treated_as_otp_request() -> None:
    result = assess_text_risk(
        "Mã OTP của bạn là 123456. Tuyệt đối không chia sẻ mã này cho bất kỳ ai. "
        "Ngân hàng không bao giờ yêu cầu OTP.",
        "sms",
    )
    assert result.score < 0.40
    assert "S-CONT-02" not in features(result)


def test_short_legitimate_otp_warning_is_not_treated_as_request() -> None:
    result = assess_text_risk(
        "Mã OTP của bạn là 123456. Không chia sẻ mã này cho bất kỳ ai.",
        "sms",
    )
    assert result.score < 0.40
    assert "S-CONT-02" not in features(result)


def test_conversation_turns_are_included_in_sms_assessment() -> None:
    result = assess_text_risk(
        "",
        "sms",
        {
            "conversation_turns": [
                {"text": "Xin lỗi tôi nhầm số, kết bạn Zalo nhé."},
                {"text": "Tôi có cơ hội đầu tư USDT lợi nhuận cao."},
            ]
        },
    )
    assert result.score >= 0.80
    assert "S-CONV-01" in features(result)


def test_sms_otp_request_applies_mandatory_floor() -> None:
    result = assess_text_risk(
        "Tài khoản bị khóa ngay. Hãy gửi lại mã OTP này cho nhân viên để xác minh.",
        "sms",
    )
    assert result.score >= 0.85
    assert "S-CONT-02" in features(result)


def test_sms_job_task_deposit_applies_mandatory_floor() -> None:
    result = assess_text_risk(
        "Việc online làm nhiệm vụ nhận hoa hồng. Nạp tiền chốt đơn để rút tiền ngay.",
        "sms",
    )
    assert result.score >= 0.85
    assert "S-CONT-04" in features(result)


def test_sms_wrong_number_to_investment_applies_mandatory_floor() -> None:
    result = assess_text_risk(
        "Xin lỗi tôi nhầm số. Kết bạn Zalo trao đổi nhé, tôi có cơ hội đầu tư USDT lợi nhuận cao.",
        "sms",
    )
    assert result.score >= 0.80
    assert "S-CONV-01" in features(result)


class _StubEngine:
    models_loaded = False
    model_status: dict = {}

    def predict_text(self, text: str, metadata: dict | None = None) -> PredictionResult:
        return PredictionResult(0.08, [], "stub-text")

    def predict_url(self, url: str) -> PredictionResult:
        return PredictionResult(
            0.84,
            [
                Evidence(
                    source="url_adapter",
                    message="Domain giả thương hiệu",
                    severity=Severity.HIGH,
                    feature="brand_domain_mismatch",
                    contribution=0.2,
                )
            ],
            "stub-url",
        )


def test_single_embedded_brand_signal_does_not_inflate_message_to_80() -> None:
    service = InferenceService(engine=_StubEngine())
    response = service.assess_text(
        '<a href="https://danger.example/login">Xem hóa đơn</a>',
        "email",
    )
    assert response.risk_score < 0.65
    assert any(item.source.startswith("embedded_url_1:") for item in response.evidence)


class _CoordinatedURLStubEngine(_StubEngine):
    def predict_url(self, url: str) -> PredictionResult:
        return PredictionResult(
            1.0,
            [
                Evidence(
                    source="url_adapter",
                    message=feature,
                    severity=Severity.HIGH,
                    feature=feature,
                    contribution=0.2,
                )
                for feature in (
                    "brand_domain_mismatch",
                    "deceptive_subdomain",
                    "credential_theft_intent",
                )
            ],
            "stub-url",
        )


def test_coordinated_embedded_url_core_override_protects_message() -> None:
    service = InferenceService(engine=_CoordinatedURLStubEngine())
    response = service.assess_text(
        '<a href="https://paypal.security.example/login">Đăng nhập</a>',
        "email",
    )

    assert response.risk_score >= 0.80
