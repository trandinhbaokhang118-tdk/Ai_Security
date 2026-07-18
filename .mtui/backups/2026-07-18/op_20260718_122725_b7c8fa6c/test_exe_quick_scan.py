from __future__ import annotations

import struct
from typing import Any

from security.exe_quick_scan import (
    ExeQuickScanService,
    MetaDefenderProvider,
    PEQuickAnalyzer,
)


def build_pe(
    *,
    section_name: bytes = b".text",
    section_data: bytes = b"\x90" * 512,
    section_flags: int = 0x60000020,
    signature: bool = False,
) -> bytes:
    pe_offset = 0x80
    optional_size = 224
    section_table = pe_offset + 4 + 20 + optional_size
    raw_pointer = 0x200
    raw_size = max(512, len(section_data))
    data = bytearray(raw_pointer + raw_size)
    data[:2] = b"MZ"
    struct.pack_into("<I", data, 0x3C, pe_offset)
    data[pe_offset : pe_offset + 4] = b"PE\0\0"
    struct.pack_into(
        "<HHIIIHH",
        data,
        pe_offset + 4,
        0x014C,
        1,
        1_700_000_000,
        0,
        0,
        optional_size,
        0x010F,
    )
    optional_offset = pe_offset + 24
    struct.pack_into("<H", data, optional_offset, 0x10B)
    struct.pack_into("<I", data, optional_offset + 16, 0x1000)
    struct.pack_into("<H", data, optional_offset + 68, 3)
    struct.pack_into("<I", data, optional_offset + 92, 16)

    name = section_name[:8].ljust(8, b"\0")
    data[section_table : section_table + 8] = name
    struct.pack_into(
        "<IIII",
        data,
        section_table + 8,
        len(section_data),
        0x1000,
        raw_size,
        raw_pointer,
    )
    struct.pack_into("<I", data, section_table + 36, section_flags)
    data[raw_pointer : raw_pointer + len(section_data)] = section_data

    if signature:
        signature_offset = len(data)
        signature_data = b"SIGNATURE" * 8
        data.extend(signature_data)
        security_entry = optional_offset + 96 + (8 * 4)
        struct.pack_into("<II", data, security_entry, signature_offset, len(signature_data))
    return bytes(data)


class FakeProvider:
    configured = True

    def __init__(self, lookup: dict[str, Any]) -> None:
        self.lookup = lookup
        self.submissions = 0

    def lookup_hash(self, _sha256: str) -> dict[str, Any]:
        return dict(self.lookup)

    def submit(self, _data: bytes, _filename: str) -> dict[str, Any]:
        self.submissions += 1
        return {
            "name": "fake",
            "configured": True,
            "status": "queued",
            "data_id": "job-1",
            "progress": 0,
            "detected_engines": 0,
            "total_engines": 0,
            "detections": [],
            "risk_score": 0,
            "sample_shared": True,
            "error": None,
        }

    def report(self, _data_id: str) -> dict[str, Any]:
        return {
            "name": "fake",
            "configured": True,
            "status": "completed",
            "data_id": "job-1",
            "progress": 100,
            "detected_engines": 4,
            "total_engines": 30,
            "detections": [{"engine": "ExampleAV", "threat": "Trojan.Test"}],
            "risk_score": 88,
            "sample_shared": True,
            "error": None,
        }

    def disabled_result(self) -> dict[str, Any]:
        return {
            "name": "fake",
            "configured": False,
            "status": "disabled",
            "data_id": None,
            "progress": 0,
            "detected_engines": 0,
            "total_engines": 0,
            "detections": [],
            "risk_score": 0,
            "sample_shared": False,
            "error": None,
        }

    def failed_result(self, message: str) -> dict[str, Any]:
        result = self.disabled_result()
        result.update({"configured": True, "status": "failed", "error": message})
        return result


def not_found_result() -> dict[str, Any]:
    return {
        "name": "fake",
        "configured": True,
        "status": "not_found",
        "data_id": None,
        "progress": 0,
        "detected_engines": 0,
        "total_engines": 0,
        "detections": [],
        "risk_score": 0,
        "sample_shared": False,
        "error": None,
    }


def test_local_quick_scan_never_executes_and_extracts_pe_metadata() -> None:
    service = ExeQuickScanService()

    result = service.inspect(build_pe(signature=True), "sample.exe")

    assert result["ok"] is True
    assert result["dynamic_execution"] is False
    assert result["analysis_mode"] == "quick_scan"
    assert result["local_analysis"]["architecture"] == "x86"
    assert result["local_analysis"]["section_count"] == 1
    assert result["signature_status"] == "present_unverified"
    assert result["processes"] == []
    assert result["provider"]["status"] == "disabled"


def test_invalid_executable_is_rejected_without_provider_upload() -> None:
    provider = FakeProvider(not_found_result())
    service = ExeQuickScanService(provider=provider)  # type: ignore[arg-type]

    result = service.inspect(b"not-a-pe", "bad.exe", share_with_provider=True)

    assert result["ok"] is False
    assert result["verdict"] == "unknown"
    assert provider.submissions == 0
    assert "MZ" in result["issues"][0]


def test_rwx_high_entropy_section_is_flagged() -> None:
    analyzer = PEQuickAnalyzer()
    varied = bytes(range(256)) * 4

    result = analyzer.inspect(
        build_pe(section_name=b"UPX0", section_data=varied, section_flags=0xE0000020),
        "packed.exe",
    )

    assert result["valid"] is True
    assert result["risk_score"] >= 35
    assert any("RWX" in issue for issue in result["anomalies"])
    assert any("packer" in issue for issue in result["anomalies"])


def test_unknown_hash_requires_consent_and_does_not_upload_by_default() -> None:
    provider = FakeProvider(not_found_result())
    service = ExeQuickScanService(provider=provider)  # type: ignore[arg-type]

    result = service.inspect(build_pe(), "sample.exe")

    assert result["provider"]["status"] == "not_found"
    assert result["upload_consent_required"] is True
    assert provider.submissions == 0


def test_explicit_consent_submits_unknown_sample() -> None:
    provider = FakeProvider(not_found_result())
    service = ExeQuickScanService(provider=provider)  # type: ignore[arg-type]

    result = service.inspect(build_pe(), "sample.exe", share_with_provider=True)

    assert provider.submissions == 1
    assert result["execution_status"] == "queued"
    assert result["provider"]["data_id"] == "job-1"
    assert result["provider"]["sample_shared"] is True


def test_provider_poll_returns_normalized_completed_report() -> None:
    provider = FakeProvider(not_found_result())
    service = ExeQuickScanService(provider=provider)  # type: ignore[arg-type]

    report = service.provider_report("job-1")

    assert report["status"] == "completed"
    assert report["detected_engines"] == 4
    assert report["risk_score"] == 88


def test_metadefender_payload_normalization_extracts_detections() -> None:
    provider = MetaDefenderProvider("test-key")

    report = provider._normalize(  # noqa: SLF001
        {
            "data_id": "abc",
            "process_info": {"progress_percentage": 100},
            "scan_results": {"total_detected_avs": 2, "total_avs": 30},
            "scan_details": {
                "EngineA": {"scan_result_i": 1, "threat_found": "Trojan.Test"},
                "EngineB": {"scan_result_i": 0, "threat_found": ""},
            },
        },
        fallback_status="queued",
    )

    assert report["status"] == "completed"
    assert report["detected_engines"] == 2
    assert report["detections"] == [{"engine": "EngineA", "threat": "Trojan.Test"}]
    assert report["risk_score"] == 70
