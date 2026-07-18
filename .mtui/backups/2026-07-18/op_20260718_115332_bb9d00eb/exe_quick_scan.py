"""Fast, non-executing Windows PE analysis with optional reputation lookup.

The local analyzer never starts the uploaded executable. It validates the PE
layout, extracts structural metadata, measures section entropy, and reports
common packing or tampering indicators. A configured provider may be used for
hash lookup and, only with explicit consent, sample upload.
"""

from __future__ import annotations

import hashlib
import math
import struct
from datetime import datetime, timezone
from pathlib import PurePath
from typing import Any

import httpx


PRIVACY_NOTICE = (
    "Nếu bật chia sẻ mẫu, tệp sẽ được gửi đến MetaDefender Cloud và có thể được "
    "lưu hoặc chia sẻ với các nhà cung cấp bảo mật. Không gửi tệp riêng tư, mã "
    "nguồn nội bộ hoặc phần mềm chưa công bố."
)

_MACHINE_NAMES = {
    0x014C: "x86",
    0x0200: "ia64",
    0x8664: "x64",
    0xAA64: "arm64",
}
_SUBSYSTEM_NAMES = {
    1: "native",
    2: "windows_gui",
    3: "windows_console",
    7: "posix_console",
    9: "windows_ce_gui",
    10: "efi_application",
    11: "efi_boot_service_driver",
    12: "efi_runtime_driver",
    13: "efi_rom",
    14: "xbox",
    16: "windows_boot_application",
}
_SUSPICIOUS_SECTION_MARKERS = (
    "upx",
    "mpress",
    "aspack",
    "petite",
    "packed",
    "vmp",
    "themida",
)


def _entropy(data: bytes) -> float:
    if not data:
        return 0.0
    counts = [0] * 256
    for value in data:
        counts[value] += 1
    length = len(data)
    return round(
        -sum((count / length) * math.log2(count / length) for count in counts if count),
        3,
    )


def _safe_int(value: object, default: int = 0) -> int:
    try:
        return int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default


def _final_verdict(score: int) -> str:
    if score >= 75:
        return "dangerous"
    if score >= 35:
        return "suspicious"
    return "no_obvious_theft_detected"


class PEQuickAnalyzer:
    """Parse enough of a PE file to provide useful static triage."""

    def inspect(self, data: bytes, filename: str) -> dict[str, Any]:
        result: dict[str, Any] = {
            "valid": False,
            "format": "unknown",
            "architecture": "unknown",
            "subsystem": "unknown",
            "entry_point_rva": 0,
            "section_count": 0,
            "sections": [],
            "signature_present": False,
            "overlay_bytes": 0,
            "compile_time": None,
            "characteristics": 0,
            "anomalies": [],
            "risk_score": 0,
        }
        anomalies: list[str] = result["anomalies"]
        if not filename.lower().endswith(".exe"):
            anomalies.append("Tên tệp không có phần mở rộng .exe.")
        if len(data) < 0x40 or data[:2] != b"MZ":
            anomalies.append("Không tìm thấy DOS header MZ hợp lệ.")
            return result

        try:
            pe_offset = struct.unpack_from("<I", data, 0x3C)[0]
            if pe_offset < 0x40 or pe_offset + 24 > len(data):
                raise ValueError("PE header nằm ngoài phạm vi tệp")
            if data[pe_offset : pe_offset + 4] != b"PE\0\0":
                raise ValueError("Không tìm thấy chữ ký PE")

            coff_offset = pe_offset + 4
            machine, section_count, timestamp, _, _, optional_size, characteristics = (
                struct.unpack_from("<HHIIIHH", data, coff_offset)
            )
            optional_offset = coff_offset + 20
            section_table_offset = optional_offset + optional_size
            if optional_size < 70 or section_table_offset > len(data):
                raise ValueError("Optional header không hợp lệ")

            magic = struct.unpack_from("<H", data, optional_offset)[0]
            if magic == 0x10B:
                pe_format = "PE32"
                data_directory_offset = optional_offset + 96
            elif magic == 0x20B:
                pe_format = "PE32+"
                data_directory_offset = optional_offset + 112
            else:
                raise ValueError(f"Optional header magic không được hỗ trợ: 0x{magic:04x}")

            entry_point = struct.unpack_from("<I", data, optional_offset + 16)[0]
            subsystem = struct.unpack_from("<H", data, optional_offset + 68)[0]
            signature_offset = 0
            signature_size = 0
            security_entry = data_directory_offset + (8 * 4)
            if security_entry + 8 <= optional_offset + optional_size:
                signature_offset, signature_size = struct.unpack_from(
                    "<II", data, security_entry
                )

            sections: list[dict[str, Any]] = []
            max_raw_end = 0
            entry_in_executable_section = False
            score = 0
            for index in range(section_count):
                offset = section_table_offset + (index * 40)
                if offset + 40 > len(data):
                    anomalies.append("Bảng section bị cắt hoặc không đầy đủ.")
                    score += 20
                    break
                raw_name = data[offset : offset + 8].split(b"\0", 1)[0]
                name = raw_name.decode("ascii", errors="replace") or f"section_{index}"
                virtual_size, virtual_address, raw_size, raw_pointer = struct.unpack_from(
                    "<IIII", data, offset + 8
                )
                flags = struct.unpack_from("<I", data, offset + 36)[0]
                raw_end = min(len(data), raw_pointer + raw_size)
                section_data = (
                    data[raw_pointer:raw_end]
                    if raw_pointer < len(data) and raw_size > 0
                    else b""
                )
                entropy = _entropy(section_data)
                executable = bool(flags & 0x20000000)
                writable = bool(flags & 0x80000000)
                readable = bool(flags & 0x40000000)
                if executable and writable:
                    score += 25
                    anomalies.append(f"Section {name} vừa ghi vừa thực thi (RWX).")
                if executable and entropy >= 7.3:
                    score += 22
                    anomalies.append(
                        f"Section thực thi {name} có entropy cao ({entropy}), có thể đã đóng gói."
                    )
                if any(marker in name.lower() for marker in _SUSPICIOUS_SECTION_MARKERS):
                    score += 25
                    anomalies.append(f"Tên section {name} giống dấu hiệu packer/protector.")
                section_span = max(virtual_size, raw_size)
                if executable and virtual_address <= entry_point < virtual_address + section_span:
                    entry_in_executable_section = True
                max_raw_end = max(max_raw_end, raw_pointer + raw_size)
                sections.append(
                    {
                        "name": name,
                        "virtual_size": virtual_size,
                        "raw_size": raw_size,
                        "entropy": entropy,
                        "readable": readable,
                        "writable": writable,
                        "executable": executable,
                    }
                )

            if section_count == 0 or section_count > 16:
                score += 15
                anomalies.append(f"Số section bất thường: {section_count}.")
            if entry_point and not entry_in_executable_section:
                score += 20
                anomalies.append("Entry point không nằm trong section thực thi thông thường.")

            signature_present = bool(
                signature_offset
                and signature_size
                and signature_offset + signature_size <= len(data)
            )
            if not signature_present:
                score += 8
                anomalies.append("Không tìm thấy Authenticode signature trong PE.")

            overlay_bytes = max(0, len(data) - max_raw_end) if max_raw_end else 0
            if overlay_bytes > max(1024 * 1024, len(data) // 4):
                score += 12
                anomalies.append(
                    f"Tệp có overlay lớn ({overlay_bytes} byte) ngoài các section PE."
                )

            compile_time = None
            if timestamp:
                try:
                    compiled = datetime.fromtimestamp(timestamp, tz=timezone.utc)
                    compile_time = compiled.isoformat()
                    if compiled > datetime.now(timezone.utc):
                        score += 8
                        anomalies.append("Compile timestamp nằm trong tương lai.")
                except (OSError, OverflowError, ValueError):
                    anomalies.append("Compile timestamp không hợp lệ.")

            result.update(
                {
                    "valid": True,
                    "format": pe_format,
                    "architecture": _MACHINE_NAMES.get(machine, f"machine_0x{machine:04x}"),
                    "subsystem": _SUBSYSTEM_NAMES.get(subsystem, f"subsystem_{subsystem}"),
                    "entry_point_rva": entry_point,
                    "section_count": section_count,
                    "sections": sections,
                    "signature_present": signature_present,
                    "overlay_bytes": overlay_bytes,
                    "compile_time": compile_time,
                    "characteristics": characteristics,
                    "risk_score": min(100, score),
                }
            )
            return result
        except (struct.error, ValueError) as exc:
            anomalies.append(f"Cấu trúc PE không hợp lệ: {exc}.")
            return result


class MetaDefenderProvider:
    """Small synchronous client for MetaDefender Cloud API v4."""

    name = "metadefender"

    def __init__(
        self,
        api_key: str,
        *,
        base_url: str = "https://api.metadefender.com/v4",
        timeout_seconds: float = 20.0,
    ) -> None:
        self.api_key = api_key.strip()
        self.base_url = base_url.rstrip("/")
        self.timeout = httpx.Timeout(timeout_seconds)

    @property
    def configured(self) -> bool:
        return bool(self.api_key)

    def _headers(self, **extra: str) -> dict[str, str]:
        return {"apikey": self.api_key, "Accept": "application/json", **extra}

    def lookup_hash(self, sha256: str) -> dict[str, Any]:
        if not self.configured:
            return self.disabled_result()
        with httpx.Client(timeout=self.timeout, follow_redirects=False) as client:
            response = client.get(
                f"{self.base_url}/hash/{sha256}",
                headers=self._headers(),
            )
        if response.status_code == 404:
            return self.not_found_result()
        response.raise_for_status()
        return self._normalize(response.json(), fallback_status="known")

    def submit(self, data: bytes, filename: str) -> dict[str, Any]:
        if not self.configured:
            return self.disabled_result()
        safe_filename = PurePath(filename).name[:180] or "sample.exe"
        with httpx.Client(timeout=self.timeout, follow_redirects=False) as client:
            response = client.post(
                f"{self.base_url}/file",
                headers=self._headers(
                    filename=safe_filename,
                    samplesharing="1",
                    **{"Content-Type": "application/octet-stream"},
                ),
                content=data,
            )
        response.raise_for_status()
        return self._normalize(
            response.json(),
            fallback_status="queued",
            sample_shared=True,
        )

    def report(self, data_id: str) -> dict[str, Any]:
        if not self.configured:
            return self.disabled_result()
        clean_id = data_id.strip()
        if not clean_id or len(clean_id) > 256:
            raise ValueError("data_id không hợp lệ")
        with httpx.Client(timeout=self.timeout, follow_redirects=False) as client:
            response = client.get(
                f"{self.base_url}/file/{clean_id}",
                headers=self._headers(),
            )
        response.raise_for_status()
        return self._normalize(response.json(), fallback_status="queued")

    def disabled_result(self) -> dict[str, Any]:
        return {
            "name": self.name,
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

    def not_found_result(self) -> dict[str, Any]:
        result = self.disabled_result()
        result.update({"configured": True, "status": "not_found"})
        return result

    def failed_result(self, message: str) -> dict[str, Any]:
        result = self.disabled_result()
        result.update(
            {
                "configured": self.configured,
                "status": "failed",
                "error": message[:300],
            }
        )
        return result

    def _normalize(
        self,
        payload: object,
        *,
        fallback_status: str,
        sample_shared: bool = False,
    ) -> dict[str, Any]:
        if isinstance(payload, list):
            candidate = next((item for item in payload if isinstance(item, dict)), {})
        elif isinstance(payload, dict):
            candidate = payload
        else:
            candidate = {}

        scan_results = candidate.get("scan_results")
        scan = scan_results if isinstance(scan_results, dict) else {}
        process_info = candidate.get("process_info")
        process = process_info if isinstance(process_info, dict) else {}
        detected = _safe_int(scan.get("total_detected_avs"))
        total = _safe_int(scan.get("total_avs"))
        progress = _safe_int(
            process.get("progress_percentage"),
            _safe_int(candidate.get("progress_percentage")),
        )
        data_id = candidate.get("data_id")
        raw_status = str(candidate.get("status") or "").lower()
        complete = progress >= 100 or bool(scan) and raw_status not in {"inqueue", "queued"}
        status = "completed" if complete else fallback_status
        if raw_status in {"inqueue", "queued", "processing"}:
            status = "queued"

        scan_details = candidate.get("scan_details")
        detections: list[dict[str, str]] = []
        if isinstance(scan_details, dict):
            for engine, detail in scan_details.items():
                if not isinstance(detail, dict):
                    continue
                threat = detail.get("threat_found") or detail.get("scan_result")
                result_code = _safe_int(detail.get("scan_result_i"))
                if not threat and result_code <= 0:
                    continue
                detections.append(
                    {
                        "engine": str(engine)[:80],
                        "threat": str(threat or "detected")[:160],
                    }
                )
                if len(detections) >= 12:
                    break

        if detected <= 0:
            provider_score = 0
        elif detected == 1:
            provider_score = 55
        elif detected <= 3:
            provider_score = 70
        else:
            provider_score = min(100, 76 + detected * 3)

        return {
            "name": self.name,
            "configured": True,
            "status": status,
            "data_id": str(data_id) if data_id else None,
            "progress": min(100, max(0, progress)),
            "detected_engines": detected,
            "total_engines": total,
            "detections": detections,
            "risk_score": provider_score,
            "sample_shared": sample_shared,
            "error": None,
        }


class ExeQuickScanService:
    """Combine local PE triage with optional provider reputation results."""

    def __init__(
        self,
        provider: MetaDefenderProvider | None = None,
        analyzer: PEQuickAnalyzer | None = None,
    ) -> None:
        self.provider = provider
        self.analyzer = analyzer or PEQuickAnalyzer()

    def inspect(
        self,
        data: bytes,
        filename: str,
        *,
        share_with_provider: bool = False,
    ) -> dict[str, Any]:
        started = datetime.now(timezone.utc)
        sha256 = hashlib.sha256(data).hexdigest()
        local = self.analyzer.inspect(data, filename)
        issues = list(local["anomalies"])
        provider_result = self._provider_disabled()

        if local["valid"] and self.provider and self.provider.configured:
            try:
                provider_result = self.provider.lookup_hash(sha256)
                if provider_result["status"] == "not_found" and share_with_provider:
                    provider_result = self.provider.submit(data, filename)
            except (httpx.HTTPError, ValueError) as exc:
                provider_result = self.provider.failed_result(str(exc))
                issues.append("Không thể lấy kết quả từ nhà cung cấp bên ngoài.")

        local_score = _safe_int(local.get("risk_score"))
        provider_score = _safe_int(provider_result.get("risk_score"))
        risk_score = min(100, max(local_score, provider_score))
        if not local["valid"]:
            verdict = "unknown"
        else:
            verdict = _final_verdict(risk_score)

        status = "queued" if provider_result.get("status") == "queued" else "completed"
        elapsed_ms = round(
            (datetime.now(timezone.utc) - started).total_seconds() * 1000,
            2,
        )
        provider_available = bool(self.provider and self.provider.configured)
        return {
            "ok": bool(local["valid"]),
            "execution_status": status,
            "analysis_mode": "quick_scan",
            "dynamic_execution": False,
            "filename": filename,
            "sha256": sha256,
            "size_bytes": len(data),
            "sandbox": "static_pe_reputation",
            "network": "provider_lookup_only",
            "verdict": verdict,
            "risk_score": risk_score,
            "issues": issues,
            "processes": [],
            "files_created": [],
            "network_attempts": [],
            "signature_status": (
                "present_unverified" if local.get("signature_present") else "not_present"
            ),
            "signer": None,
            "defender_detections": [],
            "local_analysis": local,
            "provider": provider_result,
            "provider_available": provider_available,
            "upload_consent_required": bool(
                provider_available
                and provider_result.get("status") == "not_found"
                and not share_with_provider
            ),
            "privacy_notice": PRIVACY_NOTICE,
            "elapsed_ms": elapsed_ms,
        }

    def provider_report(self, data_id: str) -> dict[str, Any]:
        if not self.provider or not self.provider.configured:
            return self._provider_disabled()
        try:
            return self.provider.report(data_id)
        except (httpx.HTTPError, ValueError) as exc:
            return self.provider.failed_result(str(exc))

    def _provider_disabled(self) -> dict[str, Any]:
        if self.provider:
            return self.provider.disabled_result()
        return {
            "name": "none",
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
