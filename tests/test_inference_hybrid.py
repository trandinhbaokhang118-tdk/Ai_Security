"""Hybrid inference tests without downloading large Transformer artifacts."""

import json

import numpy as np
import pytest

from ai.inference.engine import InferenceEngine


class _Input:
    def __init__(self, name: str):
        self.name = name


class _TransformerSession:
    def __init__(self, malicious_logit: float):
        self.malicious_logit = malicious_logit
        self.last_feed = None

    def get_inputs(self):
        return [_Input("input_ids"), _Input("attention_mask"), _Input("token_type_ids")]

    def run(self, output_names, feed):
        self.last_feed = feed
        return [np.array([[0.0, self.malicious_logit]], dtype=np.float32)]


class _Tokenizer:
    def __call__(self, text, **kwargs):
        return {
            "input_ids": np.array([[1, 42, 2]], dtype=np.int64),
            "attention_mask": np.array([[1, 1, 1]], dtype=np.int64),
        }


def test_hybrid_score_uses_all_available_components(tmp_path):
    engine = InferenceEngine(model_dir=str(tmp_path))

    assert engine._hybrid_score(0.9, 0.6, 0.2) == pytest.approx(0.77)
    assert engine._hybrid_score(None, None, 0.8) == pytest.approx(0.8)


def test_text_transformer_branch_is_executed(tmp_path):
    engine = InferenceEngine(model_dir=str(tmp_path))
    session = _TransformerSession(malicious_logit=3.0)
    engine.text_transformer_session = session
    engine.text_tokenizer = _Tokenizer()

    result = engine.predict_text("Please verify this account request")

    assert result.risk_score > 0.8
    assert result.model_version == "hybrid-text[transformer+rules]"
    assert any(item.source == "text_transformer" for item in result.evidence)
    assert session.last_feed["token_type_ids"].tolist() == [[0, 0, 0]]


def test_weak_text_transformer_metadata_disables_branch(tmp_path):
    (tmp_path / "mdeberta_text_transformer.meta.json").write_text(
        json.dumps({"metrics": {"f1": 0.52}}),
        encoding="utf-8",
    )
    engine = InferenceEngine(model_dir=str(tmp_path))
    engine.text_transformer_session = _TransformerSession(malicious_logit=5.0)
    engine.text_tokenizer = _Tokenizer()

    result = engine.predict_text("Please verify this account request")

    assert "mdeberta_text_transformer.onnx" in engine.disabled_models
    assert "transformer" not in result.model_version
    assert not any(item.source == "text_transformer" for item in result.evidence)


def test_prompt_transformer_branch_is_executed(tmp_path):
    engine = InferenceEngine(model_dir=str(tmp_path))
    session = _TransformerSession(malicious_logit=3.0)
    engine.prompt_transformer_session = session
    engine.prompt_tokenizer = _Tokenizer()

    result = engine.predict_prompt("Translate the following content")

    assert result.risk_score > 0.8
    assert result.model_version == "hybrid-prompt[transformer+rules]"
    assert any(item.source == "prompt_transformer" for item in result.evidence)
    assert session.last_feed is not None
