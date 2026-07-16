"""Run an uploaded Windows executable inside the real Windows Sandbox feature.

The host never starts the sample directly. Network, clipboard, printers and host
folders are disabled; only a read-only sample folder and a disposable report
folder are mapped into the VM.
"""
from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import tempfile
import time
from pathlib import Path
from xml.sax.saxutils import escape


class ExeSandboxRunner:
    def __init__(self, timeout_seconds: int = 45) -> None:
        self.timeout_seconds = min(max(timeout_seconds, 15), 120)

    @staticmethod
    def _base_report(filename: str, data: bytes) -> dict:
        return {
            "ok": False,
            "execution_status": "failed",
            "filename": filename,
            "sha256": hashlib.sha256(data).hexdigest(),
            "size_bytes": len(data),
            "sandbox": "windows_sandbox",
            "network": "disabled",
            "verdict": "unknown",
            "risk_score": 0,
            "issues": [],
            "processes": [],
            "files_created": [],
            "network_attempts": [],
            "elapsed_ms": 0,
        }

    def inspect(self, data: bytes, filename: str) -> dict:
        started = time.perf_counter()
        report = self._base_report(filename, data)
        if os.name != "nt":
            report["issues"].append("Tính năng chạy EXE yêu cầu máy chủ Windows.")
            return report
        if not filename.lower().endswith(".exe") or data[:2] != b"MZ":
            report["issues"].append("Tệp không phải Windows PE/EXE hợp lệ.")
            return report
        sandbox_exe = shutil.which("WindowsSandbox.exe") or str(
            Path(os.environ.get("WINDIR", r"C:\Windows")) / "System32" / "WindowsSandbox.exe"
        )
        if not Path(sandbox_exe).exists():
            report["issues"].append(
                "Windows Sandbox chưa được bật. Bật Windows feature Containers-DisposableClientVM."
            )
            return report

        with tempfile.TemporaryDirectory(prefix="aisec-exe-") as root:
            root_path = Path(root)
            input_dir, output_dir = root_path / "input", root_path / "report"
            input_dir.mkdir()
            output_dir.mkdir()
            sample_path = input_dir / "sample.exe"
            sample_path.write_bytes(data)
            script_path = output_dir / "run.ps1"
            result_path = output_dir / "result.json"
            script_path.write_text(self._powershell_script(), encoding="utf-8-sig")
            config_path = root_path / "scan.wsb"
            config_path.write_text(self._wsb_config(input_dir, output_dir), encoding="utf-8")
            creationflags = subprocess.CREATE_NO_WINDOW
            process = subprocess.Popen(
                [sandbox_exe, str(config_path)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=creationflags,
            )
            deadline = time.monotonic() + self.timeout_seconds
            while time.monotonic() < deadline and not result_path.exists():
                if process.poll() is not None:
                    break
                time.sleep(0.5)
            if result_path.exists():
                try:
                    dynamic = json.loads(result_path.read_text(encoding="utf-8-sig"))
                    report.update(dynamic)
                    report["ok"] = True
                    report["execution_status"] = "completed"
                except (OSError, ValueError) as exc:
                    report["issues"].append(f"Không đọc được báo cáo sandbox: {exc}")
            else:
                report["issues"].append("Mẫu vượt thời gian kiểm thử hoặc Windows Sandbox không khởi động.")
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
        report["elapsed_ms"] = round((time.perf_counter() - started) * 1000, 2)
        return report

    @staticmethod
    def _wsb_config(input_dir: Path, output_dir: Path) -> str:
        return f"""<Configuration>
<Networking>Disable</Networking><ClipboardRedirection>Disable</ClipboardRedirection>
<PrinterRedirection>Disable</PrinterRedirection><AudioInput>Disable</AudioInput>
<VideoInput>Disable</VideoInput><ProtectedClient>Enable</ProtectedClient>
<MappedFolders>
 <MappedFolder><HostFolder>{escape(str(input_dir))}</HostFolder><SandboxFolder>C:\\sample</SandboxFolder><ReadOnly>true</ReadOnly></MappedFolder>
 <MappedFolder><HostFolder>{escape(str(output_dir))}</HostFolder><SandboxFolder>C:\\report</SandboxFolder><ReadOnly>false</ReadOnly></MappedFolder>
</MappedFolders>
<LogonCommand><Command>powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\\report\\run.ps1</Command></LogonCommand>
</Configuration>"""

    @staticmethod
    def _powershell_script() -> str:  # noqa: E501
        return r'''$ErrorActionPreference = "SilentlyContinue"
$sample = "C:\sample\sample.exe"
$work = "C:\Users\WDAGUtilityAccount\Desktop\aisec-work"
New-Item -ItemType Directory -Force $work | Out-Null
$before = @(Get-Process | Select-Object -ExpandProperty Id)
$defender = Get-MpThreatDetection | Select-Object -First 10 ThreatName,ActionSuccess,InitialDetectionTime
$signature = Get-AuthenticodeSignature $sample
$started = Get-Date
$p = Start-Process -FilePath $sample -WorkingDirectory $work -PassThru
Start-Sleep -Seconds 18
$children = @(Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -notin $before } | Select-Object ProcessId,ParentProcessId,Name,CommandLine)
$connections = @(Get-NetTCPConnection | Where-Object { $_.OwningProcess -in $children.ProcessId } | Select-Object State,RemoteAddress,RemotePort,OwningProcess)
$files = @(Get-ChildItem $work -Recurse -File | Select-Object FullName,Length,LastWriteTime)
$children | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
$risk = 0; $issues = @()
if ($signature.Status -ne "Valid") { $risk += 25; $issues += "Tệp không có chữ ký số hợp lệ." }
if ($children.Count -gt 1) { $risk += 15; $issues += "Mẫu tạo tiến trình con." }
if ($files.Count -gt 0) { $risk += [Math]::Min(25, $files.Count * 5); $issues += "Mẫu tạo hoặc sửa tệp trong máy ảo." }
if ($connections.Count -gt 0) { $risk += 35; $issues += "Phát hiện hành vi kết nối mạng (mạng sandbox đã bị vô hiệu hóa)." }
if ($defender.Count -gt 0) { $risk = 100; $issues += "Microsoft Defender phát hiện mối đe dọa." }
$verdict = if ($risk -ge 70) { "dangerous" } elseif ($risk -ge 35) { "suspicious" } else { "no_obvious_theft_detected" }
@{ verdict=$verdict; risk_score=[Math]::Min(100,$risk); issues=$issues; processes=$children; files_created=$files; network_attempts=$connections; signature_status=[string]$signature.Status; signer=[string]$signature.SignerCertificate.Subject; defender_detections=$defender } | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 C:\report\result.json
'''
