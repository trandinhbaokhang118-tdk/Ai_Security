from security.scan_history import LocalScanHistory


def _snapshot(address: str, title: str, fingerprint: str) -> dict:
    return {
        "dns": {
            "addresses": [address],
            "nameservers": ["ns1.example.test"],
            "mx": [],
        },
        "content": {
            "title": title,
            "site_name": "Example",
            "fingerprint": fingerprint,
            "visual_hash": "0123456789abcdef",
        },
    }


def test_local_history_detects_repeated_dns_churn_and_content_repurpose(tmp_path):
    store = LocalScanHistory(tmp_path / "history.json")
    first = store.observe("example.test", _snapshot("203.0.113.1", "Example", "a"))
    second = store.observe("example.test", _snapshot("203.0.113.1", "Example", "a"))
    third = store.observe("example.test", _snapshot("203.0.113.2", "Example", "b"))
    fourth = store.observe("example.test", _snapshot("203.0.113.3", "Different", "c"))

    assert first.dns_changed is None
    assert second.dns_changed is False
    assert third.dns_distinct_snapshots == 2
    assert fourth.dns_changed is True
    assert fourth.dns_distinct_snapshots == 3
    assert fourth.content_changed is True
    assert fourth.title_changed is True
    assert fourth.previous_title == "Example"
