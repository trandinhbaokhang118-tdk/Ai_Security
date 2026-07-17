from __future__ import annotations

import hashlib
import hmac

from backend.routers.sandbox_cloud import (
    PRO_MONTHLY_PRICE_VND,
    PRO_YEARLY_PRICE_VND,
    is_incoming_sepay_transaction,
    verify_sepay_webhook_hmac,
)


def _signature(secret: str, timestamp: int, body: bytes) -> str:
    digest = hmac.new(
        secret.encode(), f"{timestamp}.".encode() + body, hashlib.sha256,
    ).hexdigest()
    return f"sha256={digest}"


def test_sepay_hmac_accepts_current_signed_raw_body() -> None:
    secret = "test-secret"
    body = b'{"id":1,"content":"PPABCDEF123456"}'
    timestamp = 1_700_000_000

    assert verify_sepay_webhook_hmac(
        body, _signature(secret, timestamp, body), str(timestamp), secret, now=timestamp,
    )


def test_sepay_hmac_rejects_modified_body_and_stale_timestamp() -> None:
    secret = "test-secret"
    timestamp = 1_700_000_000
    body = b'{"id":1}'
    signature = _signature(secret, timestamp, body)

    assert not verify_sepay_webhook_hmac(
        b'{"id":2}', signature, str(timestamp), secret, now=timestamp,
    )
    assert not verify_sepay_webhook_hmac(
        body, signature, str(timestamp), secret, now=timestamp + 301,
    )


def test_only_incoming_transactions_can_settle_a_payment() -> None:
    assert is_incoming_sepay_transaction("in")
    assert not is_incoming_sepay_transaction("out")
    assert not is_incoming_sepay_transaction("")


def test_pro_prices_match_the_public_monthly_and_yearly_offer() -> None:
    assert PRO_MONTHLY_PRICE_VND == 99_000
    assert PRO_YEARLY_PRICE_VND == 948_000
