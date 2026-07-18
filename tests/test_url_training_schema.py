from ai.adapters.url_adapter import STATIC_FEATURE_NAMES
from ai.training.train_url_lgbm import select_trained_feature_names


def test_training_schema_excludes_context_features_without_coverage() -> None:
    names = select_trained_feature_names(
        {"dns_available": 90, "rdap_available": 1},
        sample_count=100,
        minimum_context_coverage=0.05,
    )

    assert names[: len(STATIC_FEATURE_NAMES)] == STATIC_FEATURE_NAMES
    assert "dns_available" in names
    assert "rdap_available" not in names


def test_training_schema_is_static_when_dataset_has_no_context() -> None:
    names = select_trained_feature_names(
        {}, sample_count=100, minimum_context_coverage=0.05
    )

    assert names == STATIC_FEATURE_NAMES
