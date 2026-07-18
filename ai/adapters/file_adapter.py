"""File Static Risk Adapter (design.md §9).

Static-only PE/file inspection: magic bytes, entropy, suspicious strings, size.
No dynamic execution, no sandbox (per Non-Goals). Operates on raw bytes so it works
without external tooling.
"""

from __future__ import annotations

import math
import re

from shared.schemas import Evidence, Severity

_SUSPICIOUS_STRINGS = (
    b"CreateRemoteThread", b"VirtualAllocEx", b"WriteProcessMemory", b"powershell",
    b"cmd.exe", b"WScript.Shell", b"URLDownloadToFile", b"ShellExecute",
    b"RegSetValue", b"IsDebuggerPresent",
)
_PACKER_SIGNS = (b"UPX!", b"ASPack", b"PECompact", b".themida")
_ACTIVE_EXTENSIONS = re.compile(
    r"\.(apk|bat|cmd|com|exe|hta|iso|js|jar|lnk|msi|ps1|scr|svg|vbs|wsf|sh)$",
    re.I,
)


def byte_entropy(data: bytes) -> float:
    if not data:
        return 0.0
    counts = [0] * 256
    for b in data:
        counts[b] += 1
    n = len(data)
    return -sum((c / n) * math.log2(c / n) for c in counts if c)


def analyze_file_bytes(data: bytes, filename: str = "") -> tuple[float, list[Evidence]]:
    ev: list[Evidence] = []
    score = 0.05

    is_pe = data[:2] == b"MZ"
    is_script = bool(_ACTIVE_EXTENSIONS.search(filename))
    suffixes = re.findall(r"\.[a-z0-9]{1,8}", filename.lower())
    double_extension = len(suffixes) >= 2 and bool(_ACTIVE_EXTENSIONS.search(filename))

    if is_pe:
        ev.append(Evidence(source="file_adapter", message="File thực thi PE (MZ header)",
                           severity=Severity.MEDIUM, feature="pe_header", contribution=0.15))
        score += 0.15

    ent = byte_entropy(data[:65536])
    if ent > 7.2:
        ev.append(Evidence(source="file_adapter",
                           message=f"Entropy cao ({ent:.2f}) — có thể bị đóng gói/mã hóa",
                           severity=Severity.HIGH, feature="entropy", contribution=0.25))
        score += 0.25

    for sign in _PACKER_SIGNS:
        if sign in data[:65536]:
            ev.append(Evidence(source="file_adapter",
                               message=f"Dấu hiệu packer: {sign.decode(errors='ignore')}",
                               severity=Severity.HIGH, feature="packer", contribution=0.2))
            score += 0.2
            break

    hits = [s.decode(errors="ignore") for s in _SUSPICIOUS_STRINGS if s in data]
    if hits:
        ev.append(Evidence(source="file_adapter",
                           message=f"Chuỗi API đáng ngờ: {', '.join(hits[:4])}",
                           severity=Severity.HIGH, feature="suspicious_strings",
                           contribution=0.1 * min(len(hits), 3)))
        score += 0.1 * min(len(hits), 3)

    if is_script:
        ev.append(Evidence(source="file_adapter", message="Tệp có đuôi có thể thực thi hoặc kích hoạt nội dung",
                           severity=Severity.MEDIUM, feature="script_type", contribution=0.15))
        score += 0.15

    if double_extension:
        ev.append(Evidence(
            source="file_adapter",
            message="Tên tệp dùng đuôi kép để che giấu loại có thể thực thi",
            severity=Severity.HIGH,
            feature="double_extension",
            contribution=0.2,
        ))
        score += 0.2

    if data.startswith(b"%PDF-") and re.search(
        rb"/(?:JavaScript|JS|OpenAction|Launch)\b", data[:2_000_000], re.I
    ):
        ev.append(Evidence(
            source="file_adapter",
            message="PDF chứa hành động hoặc script có thể tự kích hoạt",
            severity=Severity.HIGH,
            feature="pdf_active_content",
            contribution=0.25,
        ))
        score += 0.25

    if not ev:
        ev.append(Evidence(source="file_adapter", message="Không phát hiện dấu hiệu tĩnh đáng ngờ",
                           severity=Severity.INFO, contribution=0.02))
    return min(score, 1.0), ev
