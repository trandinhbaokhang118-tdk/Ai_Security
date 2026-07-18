from types import SimpleNamespace

from backend.services.inference_service import _url_model_feature_context


def test_url_model_feature_context_combines_completed_collectors() -> None:
    domain = SimpleNamespace(age_days=12, certificate_age_days=8)
    dns = SimpleNamespace(
        available=True,
        addresses=("203.0.113.10",),
        nameservers=("ns1.example.test", "ns2.example.test"),
        mx=("mail.example.test",),
    )
    urlvet = [
        SimpleNamespace(
            metadata={
                "feature_context": {
                    "redirect_available": 1.0,
                    "redirect_count": 2.0,
                }
            }
        )
    ]

    context = _url_model_feature_context(domain, dns, urlvet, [object()])

    assert context == {
        "local_feed_checked": 1.0,
        "local_feed_hit": 1.0,
        "dns_available": 1.0,
        "dns_resolves": 1.0,
        "dns_record_count": 4.0,
        "rdap_available": 1.0,
        "domain_age_days": 12.0,
        "redirect_available": 1.0,
        "redirect_count": 2.0,
    }


def test_url_model_feature_context_marks_missing_optional_sources() -> None:
    context = _url_model_feature_context(None, None, [], [])

    assert context == {
        "local_feed_checked": 1.0,
        "local_feed_hit": 0.0,
    }
