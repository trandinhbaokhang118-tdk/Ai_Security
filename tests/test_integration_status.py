from fastapi.testclient import TestClient

from backend.config import Settings
from backend.main import app
from backend.services.integration_status_service import integration_status


def test_integration_status_reports_missing_fields_without_secret_values() -> None:
    settings = Settings(
        _env_file=None,
        gmail_oauth_client_id="client-id",
        gmail_oauth_client_secret="super-secret",
        gmail_oauth_redirect_uri="http://localhost/callback",
        gmail_token_encryption_keys="",
        sepay_bank_account="123456",
    )

    result = integration_status(settings)
    serialized = str(result)

    assert result["gmail"]["status"] == "not_configured"
    assert result["gmail"]["missing"] == ["GMAIL_TOKEN_ENCRYPTION_KEYS"]
    assert result["sepay"]["status"] == "not_configured"
    assert "super-secret" not in serialized
    assert "123456" not in serialized


def test_integration_status_marks_complete_provider_configuration_ready() -> None:
    settings = Settings(
        _env_file=None,
        gmail_oauth_client_id="client-id",
        gmail_oauth_client_secret="secret",
        gmail_oauth_redirect_uri="http://localhost/callback",
        gmail_token_encryption_keys="fernet-key",
        sepay_webhook_secret="webhook-secret",
        sepay_bank_account="123",
        sepay_bank_name="Bank",
        sepay_account_name="Owner",
        aws_sandbox_ami_id="ami-1",
        aws_sandbox_subnet_id="subnet-1",
        aws_sandbox_security_group_id="sg-1",
        metadefender_api_key="provider-key",
        misp_enabled=True,
        misp_base_url="https://misp.example",
        misp_api_key="misp-key",
    )

    result = integration_status(
        settings,
        clamav_is_ready=True,
        cloud_sandbox_is_configured=True,
    )

    assert result["gmail"]["ready"] is True
    assert result["sepay"]["ready"] is True
    assert result["cloud_sandbox"]["ready"] is True
    assert result["metadefender"]["ready"] is True
    assert result["misp"]["ready"] is True


def test_cloud_sandbox_configuration_is_inferred_for_direct_callers() -> None:
    settings = Settings(
        _env_file=None,
        aws_sandbox_ami_id="ami-1",
        aws_sandbox_subnet_id="subnet-1",
        aws_sandbox_security_group_id="sg-1",
    )

    result = integration_status(settings)

    assert result["cloud_sandbox"]["configured"] is True
    assert result["cloud_sandbox"]["missing"] == []


def test_public_integration_preflight_has_safe_contract() -> None:
    response = TestClient(app).get("/v1/integrations/status")

    assert response.status_code == 200
    body = response.json()["integrations"]
    assert {"gmail", "sepay", "cloud_sandbox", "metadefender", "clamav"} <= body.keys()
    assert all(
        {"status", "configured", "ready", "missing"} <= provider.keys()
        for provider in body.values()
    )
