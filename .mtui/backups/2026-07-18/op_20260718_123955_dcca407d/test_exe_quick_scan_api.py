from __future__ import annotations

import struct
from typing import Any

from fastapi.testclient import TestClient

from backend.main import app
from backend.routers import assess
from security.exe_quick_scan import ExeQuickScanService

client = TestClient(app)


def build_pe() -> bytes:
    pe_offset = 0x80
    optional_size = 224
    section_table = pe_offset + 4 + 20 + optional_size
    raw_pointer = 0x200
    raw_size = 512
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
    data[section_table : section_table + 8] = b".text\0\0\0"
    struct.pack_into("<IIII", data, section_table + 8, 512, 0x1000, raw_size, raw_pointer)
    struct.pack_into("<I", data, section_table + 36, 0x60000020)
    data[raw_pointer:] = b"\x90" * raw_size
    return bytes(data)


class ConsentProvider:
    configured = True

    def __init__(self) -> None:
        self.submissions = 0

    def lookup_hash(self, _sha256: str) -> dict[str, Any]:
        return self._result("not_found")

    def submit(self, _data: bytes, _filename: str) -> dict[str, Any]:
        self.submissions += 1
        result = self._result("queued")
        result.update({"data_id": "job-1", "sample_shared": True})
        return result

    def report(self, _data_id: str) -> dict[str, Any]:
        return self._result("completed")

    def disabled_result(self) -> dict[str, Any]:
        return self._result("disabled", configured=False)

    def failed_result(self, message: str) -> dict[str, Any]:
        result = self._result("failed")
        result["error"] = message
        return result

    @staticmethod
    def _result(status: str, *, configured: bool = True) -> dict[str, Any]:
        return {
            "name": "fake",
            "configured": configured,
            "status": status,
            "data_id": None,
            "progress": 0,
            "detected_engines": 0,
            "total_engines": 0,
            "detections": [],
            "risk_score": 0,
            "sample_shared": False,
            "error": None,
        }


def test_quick_scan_endpoint_runs_local_analysis_without_execution(monkeypatch) -> None:
    monkeypatch.setattr(assess, "exe_quick_scan_service", ExeQuickScanService())

    response = client.post(
        "/v1/assess/file/exe-quick-scan",
        files={"file": ("sample.exe", build_pe(), "application/octet-stream")},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["analysis_mode"] == "quick_scan"
    assert body["dynamic_execution"] is False
    assert body["local_analysis"]["architecture"] == "x86"
    assert body["provider"]["status"] == "disabled"


def test_quick_scan_endpoint_does_not_upload_without_explicit_consent(monkeypatch) -> None:
    provider = ConsentProvider()
    monkeypatch.setattr(
        assess,
        "exe_quick_scan_service",
        ExeQuickScanService(provider=provider),  # type: ignore[arg-type]
    )

    response = client.post(
        "/v1/assess/file/exe-quick-scan",
        files={"file": ("sample.exe", build_pe(), "application/octet-stream")},
        data={"share_with_provider": "false"},
    )

    assert response.status_code == 200
    assert provider.submissions == 0
    assert response.json()["upload_consent_required"] is True


def test_quick_scan_endpoint_uploads_only_after_explicit_consent(monkeypatch) -> None:
    provider = ConsentProvider()
    monkeypatch.setattr(
        assess,
        "exe_quick_scan_service",
        ExeQuickScanService(provider=provider),  # type: ignore[arg-type]
    )

    response = client.post(
        "/v1/assess/file/exe-quick-scan",
        files={"file": ("sample.exe", build_pe(), "application/octet-stream")},
        data={"share_with_provider": "true"},
    )

    assert response.status_code == 200
    body = response.json()
    assert provider.submissions == 1
    assert body["execution_status"] == "queued"
    assert body["provider"]["sample_shared"] is True


def test_quick_scan_endpoint_rejects_non_exe_extension(monkeypatch) -> None:
    monkeypatch.setattr(assess, "exe_quick_scan_service", ExeQuickScanService())

    response = client.post(
        "/v1/assess/file/exe-quick-scan",
        files={"file": ("sample.bin", build_pe(), "application/octet-stream")},
    )

    assert response.status_code == 400
    assert "Chỉ chấp nhận" in response.json()["detail"]
