"""CoreGuide v2 criterion registry and conservative observation-to-evidence adapters.

Every criterion has an explicit implementation. A detector only emits risk when its
required observation is present; missing data becomes NOT_CHECKED/UNAVAILABLE rather
than a fabricated clean verdict.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any

from .config import RiskConfig
from .normalization import make_finding_key, make_incident_key, normalize_url
from .types import CriterionStatus, EvidenceV2, MatchedSubject, ProviderVerdict


@dataclass
class ScanObservations:
    url: str
    findings: dict[int, list[dict[str, Any]]] = field(default_factory=dict)
    completed: set[int] = field(default_factory=set)
    unavailable: dict[int, str] = field(default_factory=dict)
    not_applicable: dict[int, str] = field(default_factory=dict)

    def risk(
        self,
        criterion_id: int,
        finding_type: str,
        severity: float,
        quality: float,
        summary: str,
        *,
        source: str = "internal",
        incident: str = "scan",
        metadata: dict[str, Any] | None = None,
    ) -> None:
        self.completed.add(criterion_id)
        self.findings.setdefault(criterion_id, []).append(
            {
                "finding_type": finding_type,
                "severity": severity,
                "quality": quality,
                "summary": summary,
                "source": source,
                "incident": incident,
                "metadata": metadata or {},
            }
        )

    def clean(self, *criterion_ids: int) -> None:
        self.completed.update(criterion_ids)


def build_criteria_evidence(observations: ScanObservations, config: RiskConfig) -> list[EvidenceV2]:
    """Produce one auditable status/evidence record for all criteria 1..50."""
    keys = normalize_url(observations.url)
    output: list[EvidenceV2] = []
    for criterion in config.criteria:
        cid = criterion.criterion_id
        findings = observations.findings.get(cid, [])
        if findings:
            for index, finding in enumerate(findings):
                finding_type = str(finding["finding_type"])
                severity = max(0.0, min(1.0, float(finding["severity"])))
                quality = max(0.0, min(1.0, float(finding["quality"])))
                source = str(finding.get("source", "internal"))
                output.append(
                    _evidence(
                        keys,
                        cid,
                        source,
                        finding_type,
                        CriterionStatus.MALICIOUS
                        if severity >= 0.75
                        else CriterionStatus.SUSPICIOUS,
                        ProviderVerdict.MALICIOUS
                        if severity >= 0.75
                        else ProviderVerdict.SUSPICIOUS,
                        severity,
                        quality,
                        str(finding["summary"]),
                        index,
                        str(finding.get("incident", "scan")),
                        dict(finding.get("metadata", {})),
                    )
                )
            continue
        if cid in observations.not_applicable:
            output.append(
                _status(
                    keys,
                    cid,
                    CriterionStatus.NOT_APPLICABLE,
                    observations.not_applicable[cid],
                    applicability=True,
                )
            )
        elif cid in observations.unavailable:
            output.append(
                _status(keys, cid, CriterionStatus.UNAVAILABLE, observations.unavailable[cid])
            )
        elif cid in observations.completed or cid == 50:
            output.append(
                _status(keys, cid, CriterionStatus.CLEAN, "Check completed without a risk finding.")
            )
        else:
            output.append(
                _status(
                    keys,
                    cid,
                    CriterionStatus.NOT_CHECKED,
                    "Required observation was not collected in this scan mode.",
                )
            )
    return output


def add_offline_url_findings(obs: ScanObservations, legacy_evidence: list[Any]) -> None:
    mapping = {
        "punycode_domain": 6,
        "homoglyph": 6,
        "high_entropy_domain": 6,
        "brand_domain_mismatch": 5,
        "brand_typosquatting": 5,
        "deceptive_subdomain": 7,
        "no_https": 8,
        "is_shortlink": 17,
        "redirect_parameter": 18,
        "nested_url_redirect": 16,
        "credential_theft_intent": 29,
        "credential_lure_cluster": 29,
        "url_obfuscation": 18,
        "at_symbol": 18,
        "embedded_credentials": 18,
        "nonstandard_port": 18,
        "excessive_query_parameters": 18,
    }
    checked = {5, 6, 7, 8, 16, 17, 18, 29}
    obs.clean(*checked)
    severity = {"critical": 1.0, "high": 0.85, "medium": 0.6, "low": 0.35, "info": 0.0}
    for item in legacy_evidence:
        cid = mapping.get(item.feature or "")
        if cid and (item.contribution or 0) > 0:
            obs.risk(
                cid,
                item.feature,
                severity[item.severity.value],
                0.8 if item.source == "url_risk_core" else 0.5,
                item.message,
                source="internal_url",
            )


def add_domain_intelligence(obs: ScanObservations, intelligence: Any) -> None:
    if not intelligence.available:
        for cid in (1, 3, 4, 11, 12):
            obs.unavailable[cid] = "Domain intelligence providers unavailable."
        return
    obs.clean(1, 3, 4, 11, 12)
    if intelligence.age_days is not None and intelligence.age_days < 180:
        severity = (
            1.0 if intelligence.age_days < 30 else 0.75 if intelligence.age_days < 90 else 0.5
        )
        obs.risk(
            1,
            "young_domain",
            severity,
            0.8,
            f"Domain age is {intelligence.age_days} days (verified by registration intelligence).",
            source="domain_intelligence",
        )
    if intelligence.listed:
        obs.risk(
            11,
            "public_malicious_listing",
            1.0,
            0.8,
            "Public reputation intelligence reports a malicious exact domain result.",
            source=intelligence.reputation_source,
        )


def add_http_sandbox(obs: ScanObservations, report: Any) -> None:
    covered = {8, 9, 10, 16, 20, 24, 25, 28, 29, 30, 33, 35, 36, 37, 46, 47}
    if not report.ok:
        reason = report.issues[0].message if report.issues else "HTTP sandbox unavailable."
        for cid in covered:
            obs.unavailable[cid] = reason
        return
    obs.clean(*covered)
    issue_map = {
        "tls_certificate_error": 10,
        "meta_refresh": 16,
        "urgency_language": 28,
        "password_form": 30,
        "external_form_action": 30,
        "external_iframe": 36,
    }
    for issue in report.issues:
        cid = issue_map.get(issue.code)
        if cid:
            sev = {"critical": 1.0, "high": 0.85, "medium": 0.6, "low": 0.35}.get(
                issue.severity.value, 0.5
            )
            obs.risk(cid, issue.code, sev, 1.0, issue.message, source="http_sandbox")


def add_browser_sandbox(obs: ScanObservations, report: Any) -> None:
    covered = {16, 28, 29, 30, 33, 34, 35, 36, 37, 38}
    if not report.ok:
        reason = report.issues[0].message if report.issues else "Browser sandbox unavailable."
        for cid in covered:
            obs.unavailable[cid] = reason
        return
    obs.clean(*covered)
    issue_map = {
        "otp_input_detected": 29,
        "password_input_detected": 29,
        "cross_origin_form_action": 30,
        "canary_exfiltration_blocked": 35,
        "private_network_request_blocked": 35,
        "websocket_request_blocked": 35,
    }
    for issue in report.issues:
        cid = issue_map.get(issue.code)
        if cid:
            sev = {"critical": 1.0, "high": 0.85, "medium": 0.6, "low": 0.35}.get(
                issue.severity.value, 0.5
            )
            obs.risk(cid, issue.code, sev, 1.0, issue.message, source="browser_sandbox")



CRITERION_FIELDS: dict[int, str] = {
    1: "domain_age", 2: "domain_expiry", 3: "domain_owner", 4: "registrar_abuse",
    5: "domain_impersonation", 6: "confusable_characters", 7: "deceptive_subdomain",
    8: "insecure_transport", 9: "tls_anomaly", 10: "certificate_error", 11: "blacklist",
    12: "domain_reputation", 13: "ip_reputation", 14: "server_location",
    15: "malicious_shared_hosting", 16: "redirect_anomaly", 17: "short_url",
    18: "url_parameter_anomaly", 19: "brand_content_impersonation", 20: "contact_information",
    21: "business_email", 22: "business_address", 23: "legal_identity", 24: "privacy_policy",
    25: "terms_refund", 26: "content_quality", 27: "price_anomaly", 28: "pressure_language",
    29: "sensitive_data_request", 30: "login_form", 31: "payment_method",
    32: "payment_recipient", 33: "browser_permissions", 34: "downloaded_file",
    35: "malicious_javascript", 36: "third_party_script", 37: "scam_popup",
    38: "malvertising", 39: "copied_content", 40: "fake_image", 41: "social_identity",
    42: "website_history", 43: "content_change", 44: "dns_anomaly", 45: "email_security",
    46: "metadata_identity", 47: "support_channel", 48: "user_complaints", 49: "fake_reviews",
}


def add_structured_snapshot(obs: ScanObservations, snapshot: dict[str, Any]) -> None:
    """Evaluate typed collector observations for every internal criterion."""
    for cid, field_name in CRITERION_FIELDS.items():
        value = snapshot.get(field_name)
        if value is None:
            continue
        if not isinstance(value, dict):
            raise ValueError(f"snapshot.{field_name} must be an object")
        status = str(value.get("status", "unknown"))
        if status == "clean":
            obs.clean(cid)
        elif status == "unavailable":
            obs.unavailable[cid] = str(value.get("summary", "Collector unavailable."))
        elif status == "not_applicable":
            reason = str(value.get("summary", ""))
            if not reason:
                raise ValueError(f"snapshot.{field_name} not_applicable requires evidence")
            obs.not_applicable[cid] = reason
        elif status in {"suspicious", "malicious"}:
            obs.risk(
                cid, str(value.get("finding_type", field_name)),
                float(value.get("severity", 1.0 if status == "malicious" else 0.5)),
                float(value.get("quality", 0.5)), str(value.get("summary", field_name)),
                source=str(value.get("source", "collector")),
                incident=str(value.get("incident", field_name)),
                metadata=dict(value.get("metadata", {})),
            )
        elif status not in {"not_checked", "unknown"}:
            raise ValueError(f"snapshot.{field_name}.status is invalid: {status}")


if set(CRITERION_FIELDS) != set(range(1, 50)):
    raise RuntimeError("Every internal criterion 1..49 must have an observation field")


def _status(
    keys: Any, cid: int, status: CriterionStatus, summary: str, applicability: bool = False
) -> EvidenceV2:
    verdict = ProviderVerdict.CLEAN if status == CriterionStatus.CLEAN else ProviderVerdict.UNKNOWN
    evidence = _evidence(
        keys,
        cid,
        "risk_registry",
        f"criterion_{cid}_status",
        status,
        verdict,
        0,
        0,
        summary,
        0,
        "status",
        {},
    )
    if applicability:
        evidence.applicability_evidence_ids = (evidence.evidence_id,)
    return evidence


def _evidence(
    keys: Any,
    cid: int,
    source: str,
    finding_type: str,
    status: CriterionStatus,
    verdict: ProviderVerdict,
    severity: float,
    quality: float,
    summary: str,
    index: int,
    incident: str,
    metadata: dict[str, Any],
) -> EvidenceV2:
    stable = f"{keys.exact_subject_key}:{cid}:{source}:{finding_type}:{index}"
    evidence_id = str(uuid.uuid5(uuid.NAMESPACE_URL, stable))
    data = {"summary": summary, **metadata}
    return EvidenceV2(
        evidence_id=evidence_id,
        exact_subject_key=keys.exact_subject_key,
        campaign_subject_key=keys.campaign_subject_key,
        finding_key=make_finding_key(keys.exact_subject_key, finding_type, source),
        incident_key=make_incident_key(keys.campaign_subject_key, incident, "scan"),
        criterion_id=cid,
        source_id=source,
        organization_id=source,
        source_family="direct_behavior" if source.endswith("sandbox") else "internal",
        matched_subject=MatchedSubject.EXACT_URL,
        finding_type=finding_type,
        status=status,
        provider_verdict=verdict,
        severity=severity,
        evidence_quality=quality,
        match_strength=1.0,
        freshness_factor=1.0,
        authority_tier=4 if source.endswith("sandbox") else 3,
        observed_at="scan_cutoff",
        metadata=data,
    )
