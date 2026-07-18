"""Persistent global controls for URL scoring and URL-result caching."""

from __future__ import annotations

from sqlalchemy.orm import Session

from backend.models import SystemSetting
from backend.security_utils import utcnow

AI_CONTEXT_WEIGHT_KEY = "ai_context_weight_percent"
AI_CONTEXT_WEIGHT_MAX_PERCENT = 40
AI_CONTEXT_WEIGHT_DEFAULT_PERCENT = 0
URL_ASSESSMENT_CACHE_ENABLED_KEY = "url_assessment_cache_enabled"
THREAT_FEED_SCHEDULER_ENABLED_KEY = "threat_feed_scheduler_enabled"
THREAT_FEED_OPENPHISH_ENABLED_KEY = "threat_feed_openphish_enabled"
OPERATIONAL_MAINTENANCE_SCHEDULER_ENABLED_KEY = "operational_maintenance_scheduler_enabled"


def normalize_ai_context_weight(value: int) -> int:
    return max(0, min(AI_CONTEXT_WEIGHT_MAX_PERCENT, int(value)))


def get_ai_context_weight_percent(db: Session) -> int:
    setting = db.get(SystemSetting, AI_CONTEXT_WEIGHT_KEY)
    if setting is None:
        return AI_CONTEXT_WEIGHT_DEFAULT_PERCENT
    return normalize_ai_context_weight(setting.value)


def set_ai_context_weight_percent(
    db: Session,
    percent: int,
    *,
    updated_by_user_id: str | None,
) -> int:
    value = normalize_ai_context_weight(percent)
    setting = db.get(SystemSetting, AI_CONTEXT_WEIGHT_KEY)
    if setting is None:
        setting = SystemSetting(
            key=AI_CONTEXT_WEIGHT_KEY,
            value=value,
            updated_by_user_id=updated_by_user_id,
        )
        db.add(setting)
    else:
        setting.value = value
        setting.updated_by_user_id = updated_by_user_id
        setting.updated_at = utcnow()
    db.commit()
    return value


def get_url_assessment_cache_enabled(db: Session, *, default: bool) -> bool:
    setting = db.get(SystemSetting, URL_ASSESSMENT_CACHE_ENABLED_KEY)
    if setting is None:
        return bool(default)
    return bool(setting.value)


def set_url_assessment_cache_enabled(
    db: Session,
    enabled: bool,
    *,
    updated_by_user_id: str | None,
) -> bool:
    setting = db.get(SystemSetting, URL_ASSESSMENT_CACHE_ENABLED_KEY)
    value = int(bool(enabled))
    if setting is None:
        setting = SystemSetting(
            key=URL_ASSESSMENT_CACHE_ENABLED_KEY,
            value=value,
            updated_by_user_id=updated_by_user_id,
        )
        db.add(setting)
    else:
        setting.value = value
        setting.updated_by_user_id = updated_by_user_id
        setting.updated_at = utcnow()
    db.commit()
    return bool(value)


def _get_boolean_setting(db: Session, key: str, *, default: bool) -> bool:
    setting = db.get(SystemSetting, key)
    return bool(default) if setting is None else bool(setting.value)


def _set_boolean_setting(
    db: Session,
    key: str,
    enabled: bool,
    *,
    updated_by_user_id: str | None,
) -> bool:
    setting = db.get(SystemSetting, key)
    value = int(bool(enabled))
    if setting is None:
        db.add(SystemSetting(key=key, value=value, updated_by_user_id=updated_by_user_id))
    else:
        setting.value = value
        setting.updated_by_user_id = updated_by_user_id
        setting.updated_at = utcnow()
    db.commit()
    return bool(value)


def get_operational_switches(
    db: Session,
    *,
    threat_feed_scheduler_default: bool,
    openphish_default: bool,
    maintenance_scheduler_default: bool,
) -> dict[str, bool]:
    """Return runtime-controllable background jobs with env values as fallback."""

    return {
        "threatFeedSchedulerEnabled": _get_boolean_setting(
            db,
            THREAT_FEED_SCHEDULER_ENABLED_KEY,
            default=threat_feed_scheduler_default,
        ),
        "openphishEnabled": _get_boolean_setting(
            db,
            THREAT_FEED_OPENPHISH_ENABLED_KEY,
            default=openphish_default,
        ),
        "operationalMaintenanceSchedulerEnabled": _get_boolean_setting(
            db,
            OPERATIONAL_MAINTENANCE_SCHEDULER_ENABLED_KEY,
            default=maintenance_scheduler_default,
        ),
    }


def set_operational_switches(
    db: Session,
    *,
    threat_feed_scheduler_enabled: bool,
    openphish_enabled: bool,
    operational_maintenance_scheduler_enabled: bool,
    updated_by_user_id: str | None,
) -> dict[str, bool]:
    """Persist the three runtime controls used by the Admin console."""

    return {
        "threatFeedSchedulerEnabled": _set_boolean_setting(
            db,
            THREAT_FEED_SCHEDULER_ENABLED_KEY,
            threat_feed_scheduler_enabled,
            updated_by_user_id=updated_by_user_id,
        ),
        "openphishEnabled": _set_boolean_setting(
            db,
            THREAT_FEED_OPENPHISH_ENABLED_KEY,
            openphish_enabled,
            updated_by_user_id=updated_by_user_id,
        ),
        "operationalMaintenanceSchedulerEnabled": _set_boolean_setting(
            db,
            OPERATIONAL_MAINTENANCE_SCHEDULER_ENABLED_KEY,
            operational_maintenance_scheduler_enabled,
            updated_by_user_id=updated_by_user_id,
        ),
    }
