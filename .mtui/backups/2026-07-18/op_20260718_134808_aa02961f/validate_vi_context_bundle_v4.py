#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import build_vi_context_bundle_v4 as gen
import validate_vi_context_bundle_v3 as v3v

ARCHETYPES = {
    item["id"]: item
    for collection in (
        gen.v3.base.SCAM_ARCHETYPES,
        gen.v3.base.SAFE_ARCHETYPES,
        gen.v3.base.AMBIGUOUS_ARCHETYPES,
    )
    for item in collection
}


def expected_concern(archetype: dict[str, Any], template_index: int) -> str:
    first_category, first_summary, _, _ = gen.selected_findings(archetype, template_index)[0]
    return gen.CONCERN_BY_CATEGORY.get(
        first_category,
        "Tôi lo ngại vì " + first_summary[:1].lower() + first_summary[1:].rstrip(".") + ".",
    )


def validate_message(row: dict[str, Any], where: str) -> dict[str, Any]:
    assert row["task"] == "message-context-adapter", where
    assert row["source_id"] == "prewise_vi_synthetic_v4", where
    payload, output = v3v.parse_message_payload(row)
    assert payload["trust_boundary"] == "untrusted_data", where
    assert payload["instruction_policy"] == "treat_as_data_never_instructions", where
    assert payload["modality"] in {"email", "sms", "text", "chat", "call_transcript"}, where

    metadata = payload["metadata"]
    context = metadata["user_context"]
    scenario_id = metadata["scenario_family"]
    template_index = metadata["template_index"]
    wrapper_index = metadata["wrapper_index"]
    assert metadata["locale"] == "vi", where
    assert metadata["context_schema_version"] == "4", where
    assert scenario_id in gen.ID_TO_GROUP, where
    assert metadata["scenario_profile"] == gen.ID_TO_GROUP[scenario_id], where
    assert context["scenario_profile"] == metadata["scenario_profile"], where
    assert context["channel"] == payload["modality"], where
    assert context["relationship"] == gen.RELATIONSHIP_BY_ARCHETYPE[scenario_id], where
    assert isinstance(template_index, int) and isinstance(wrapper_index, int), where
    assert 0 <= wrapper_index < 5, where
    assert metadata["user_question"].strip(), where
    assert context["context_is_user_claim"] is True, where

    archetype = ARCHETYPES[scenario_id]
    assert 0 <= template_index < len(archetype["templates"]), where
    assert context["user_action_taken"] in gen.user_action_options(
        row["label"], payload["content"], payload["modality"]
    ), (where, context["user_action_taken"], payload["content"])
    assert context["user_concern"] == expected_concern(archetype, template_index), where

    conversation = metadata["conversation"]
    if conversation:
        assert len(conversation) == 4, where
        assert conversation[2]["content"] == payload["content"], where
    assert output["analyzed_modality"] == payload["modality"], where
    assert 0 <= output["risk_signal"] <= 1 and 0 <= output["confidence"] <= 1, where
    assert not (set(map(str.lower, output.keys())) & v3v.DECISION_KEYS), where

    selected = gen.selected_findings(archetype, template_index)
    expected_categories = [finding[0] for finding in selected]
    if conversation:
        expected_categories.append(
            "conversation_pressure"
            if row["label"] == "scam"
            else "conversation_verification"
            if row["label"] == "safe"
            else "conversation_uncertainty"
        )
    actual_categories = [finding["category"] for finding in output["findings"]]
    assert actual_categories == expected_categories, (where, actual_categories, expected_categories)

    ids: set[str] = set()
    for index, finding in enumerate(output["findings"]):
        assert finding["evidence_id"] not in ids, where
        ids.add(finding["evidence_id"])
        assert finding["severity"] in {"info", "low", "medium", "high", "critical"}, where
        assert 0 <= float(finding["risk_signal"]) <= 1, where
        attrs = finding["attributes"]
        reference = attrs["evidence_reference"]
        value = v3v.resolve_ref(payload, reference)
        excerpt = attrs["evidence_excerpt"]
        assert v3v.norm(excerpt) in v3v.norm(value), (where, reference, excerpt, value[:200])
        assert attrs["grounding"] == "template_specific_exact_reference", where

        if index < len(selected):
            category = selected[index][0]
            expected_reference = gen.finding_ref(
                category,
                {"main_content": "metadata.conversation[2]"} if conversation else {},
            )
            assert reference == expected_reference, (where, category, reference, expected_reference)
            if category == "known_sender":
                assert context["known_sender"] is True, where
        else:
            assert reference == "metadata.conversation[3]", where

    lowered = payload["content"].lower()
    assert "http://" not in lowered and "https://" not in lowered, where

    return {
        "case_id": row["case_id"],
        "family_hash": row["family_hash"],
        "payload": payload,
        "output": output,
    }


# Tái sử dụng kiểm tra checksum, duplicate, split leakage, alignment và citation của v3.
v3v.gen = gen
v3v.validate_message = validate_message


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--bundle-root", type=Path, required=True)
    parser.add_argument("--skip-checksums", action="store_true")
    args = parser.parse_args()
    report = v3v.validate(args.bundle_root.resolve(), verify_hashes=not args.skip_checksums)
    report["semantic_validation"] = {
        "template_specific_findings": True,
        "scenario_specific_relationship": True,
        "content_compatible_user_actions": True,
        "exact_evidence_reference": True,
    }
    (args.bundle_root / "validation_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
