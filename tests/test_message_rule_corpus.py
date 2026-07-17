import json
from pathlib import Path

import pytest

from security.text_risk_core import assess_text_risk

CORPUS_PATH = Path(__file__).parents[1] / "data" / "message_rule_corpus.json"
CORPUS = json.loads(CORPUS_PATH.read_text(encoding="utf-8"))


@pytest.mark.parametrize("case", CORPUS["cases"], ids=lambda case: case["id"])
def test_message_rule_regression_corpus(case):
    result = assess_text_risk(
        case["text"],
        modality=case["modality"],
        metadata=case.get("metadata"),
        model_score=0.0,
    )
    features = {item.feature for item in result.evidence}

    if "min_score" in case:
        assert result.score >= case["min_score"]
    if "max_score" in case:
        assert result.score <= case["max_score"]
    assert set(case.get("required_features", ())).issubset(features)
    assert set(case.get("forbidden_features", ())).isdisjoint(features)
