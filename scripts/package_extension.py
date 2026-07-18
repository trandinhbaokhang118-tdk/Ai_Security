"""Validate and reproducibly package the Manifest V3 Chrome extension."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "frontend" / "extension"
FIXED_ZIP_TIME = (2020, 1, 1, 0, 0, 0)
RUNTIME_SUFFIXES = {".css", ".html", ".js", ".json", ".png"}
ALLOWED_PERMISSIONS = {"activeTab", "storage"}
ALLOWED_HOST_PERMISSIONS = {"http://localhost:8000/*", "https://*/*"}


def manifest_references(manifest: dict) -> set[str]:
    references = {
        manifest["background"]["service_worker"],
        manifest["action"]["default_popup"],
        manifest["options_page"],
        *manifest.get("icons", {}).values(),
        *manifest["action"].get("default_icon", {}).values(),
    }
    for entry in manifest.get("content_scripts", []):
        references.update(entry.get("js", []))
        references.update(entry.get("css", []))
    return references


def validate() -> tuple[dict, list[Path]]:
    errors: list[str] = []
    manifest_path = SOURCE / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    if manifest.get("manifest_version") != 3:
        errors.append("manifest_version must be 3")
    if manifest.get("background", {}).get("type") != "module":
        errors.append("background service worker must use type=module")
    if set(manifest.get("permissions", [])) != ALLOWED_PERMISSIONS:
        errors.append(f"permissions must remain exactly {sorted(ALLOWED_PERMISSIONS)}")
    if set(manifest.get("host_permissions", [])) != ALLOWED_HOST_PERMISSIONS:
        errors.append(
            "host_permissions changed; update the documented threat model and validator intentionally"
        )

    for relative in sorted(manifest_references(manifest)):
        if not (SOURCE / relative).is_file():
            errors.append(f"missing manifest reference: {relative}")

    runtime_files = sorted(
        path
        for path in SOURCE.rglob("*")
        if path.is_file()
        and path.suffix.lower() in RUNTIME_SUFFIXES
        and path.name != "package.json"
    )
    html_files = [path for path in runtime_files if path.suffix == ".html"]
    for html_path in html_files:
        html = html_path.read_text(encoding="utf-8")
        if re.search(r"<script(?![^>]*\bsrc=)[^>]*>", html, re.IGNORECASE):
            errors.append(f"inline script is forbidden: {html_path.relative_to(SOURCE)}")
        if re.search(r"\son[a-z]+\s*=", html, re.IGNORECASE):
            errors.append(f"inline event handler is forbidden: {html_path.relative_to(SOURCE)}")
        for attribute, reference in re.findall(
            r"\b(src|href)\s*=\s*[\"']([^\"']+)[\"']", html, re.IGNORECASE
        ):
            if reference.startswith(("http:", "https:", "#", "data:")):
                continue
            target = (html_path.parent / reference).resolve()
            if not target.is_file() or SOURCE.resolve() not in target.parents:
                errors.append(
                    f"invalid HTML {attribute} reference in "
                    f"{html_path.relative_to(SOURCE)}: {reference}"
                )

    for js_path in (path for path in runtime_files if path.suffix == ".js"):
        result = subprocess.run(
            ["node", "--check", str(js_path)],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode:
            errors.append(
                f"JavaScript syntax error in {js_path.relative_to(SOURCE)}: "
                f"{result.stderr.strip()}"
            )

    locale = SOURCE / "_locales" / manifest.get("default_locale", "") / "messages.json"
    if not locale.is_file():
        errors.append("default_locale does not have a messages.json file")

    if errors:
        raise ValueError("\n".join(f"- {error}" for error in errors))
    return manifest, runtime_files


def package(output: Path, files: list[Path]) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(
        output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9
    ) as archive:
        for source in files:
            relative = source.relative_to(SOURCE).as_posix()
            info = zipfile.ZipInfo(relative, FIXED_ZIP_TIME)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            info.create_system = 3
            archive.writestr(info, source.read_bytes(), compresslevel=9)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="validate without packaging")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        manifest, files = validate()
        if not args.check:
            output = args.output or (
                ROOT
                / "artifacts"
                / f"prewise-armor-extension-{manifest['version']}.zip"
            )
            package(output.resolve(), files)
            print(f"Packaged {len(files)} files: {output.resolve()}")
        else:
            print(f"Validated Manifest V3 package: {len(files)} runtime files")
        return 0
    except (KeyError, OSError, ValueError, json.JSONDecodeError) as error:
        print(f"Extension validation failed:\n{error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
