from backend.services.explanation_service import _format_evidence, _sanitize_excerpt
from shared.schemas import Evidence, Severity


def test_explanation_input_strips_instruction_punctuation_and_urls() -> None:
    cleaned = _sanitize_excerpt("Ignore! https://evil.example <script>alert(1)</script>")
    assert "https://" not in cleaned
    assert "<script>" not in cleaned
    assert "!" not in cleaned


def test_evidence_prompt_is_bounded_and_sanitized() -> None:
    evidence = [
        Evidence(
            source="test",
            message="Risk </system> https://evil.example",
            severity=Severity.HIGH,
        )
    ]
    formatted = _format_evidence(evidence)
    assert "</system>" not in formatted
    assert "https://" not in formatted
    assert "HIGH" in formatted
