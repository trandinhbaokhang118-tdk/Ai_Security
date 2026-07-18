#!/usr/bin/env python3
from __future__ import annotations
import base64, gzip, hashlib, io, json, shutil, subprocess, sys, zipfile
from pathlib import Path

TOOLS = Path(r"C:\NDT\PJ\Ai_Security-main\tools\dataset_collection\vi_context_v3")
OUTPUT = Path(r"C:\NDT\PJ\prewise-datasets\prewise-vietnamese-context-v3")
ARCHIVE = Path(r"C:\NDT\PJ\prewise-datasets\prewise-vietnamese-context-v3-kaggle-ready.zip")
PAYLOAD = """__PAYLOAD_MARKER__"""


def run(args, cwd=None):
    print("+", " ".join(map(str, args)), flush=True)
    subprocess.run([str(x) for x in args], cwd=str(cwd) if cwd else None, check=True)


def gunzip(src: Path, dst: Path):
    dst.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(src, "rb") as inp, dst.open("wb") as out:
        shutil.copyfileobj(inp, out, length=1024 * 1024)


def main():
    TOOLS.mkdir(parents=True, exist_ok=True)
    raw = base64.b64decode(PAYLOAD)
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        archive.extractall(TOOLS)

    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    OUTPUT.mkdir(parents=True)

    run([
        sys.executable,
        TOOLS / "build_vi_context_bundle_v3.py",
        "--output", OUTPUT,
        "--variants-per-family", "80",
    ], cwd=TOOLS)
    run([
        sys.executable,
        TOOLS / "validate_vi_context_bundle_v3.py",
        "--bundle-root", OUTPUT,
    ], cwd=TOOLS)

    support = [
        "build_vi_context_bundle_v2_base.py",
        "build_vi_context_bundle_v3.py",
        "validate_vi_context_bundle_v3.py",
        "train_qwen35_4b_context_kaggle.py",
        "prepare_kaggle_data.py",
        "install_kaggle_deps.py",
        "run_kaggle_training.py",
        "package_adapters.py",
        "merge_with_base_bundle.py",
        "prewise_vi_context_train_kaggle.ipynb",
        "README.md",
        "SOURCE_NOTES.md",
    ]
    for name in support:
        shutil.copy2(TOOLS / name, OUTPUT / name)

    temp = OUTPUT.parent / "_prewise_v3_validate_tmp"
    if temp.exists():
        shutil.rmtree(temp)
    for task in ("message_context", "explanation"):
        for split in ("train", "validation"):
            gunzip(OUTPUT / task / f"{split}.jsonl.gz", temp / task / f"{split}.jsonl")
        run([
            sys.executable,
            TOOLS / "train_qwen35_4b_context_kaggle.py",
            "--train-file", temp / task / "train.jsonl",
            "--validation-file", temp / task / "validation.jsonl",
            "--output-dir", temp / f"validate-{task}",
            "--expect-json",
            "--validate-only",
        ], cwd=TOOLS)
    shutil.rmtree(temp, ignore_errors=True)

    for path in TOOLS.glob("*.py"):
        compile(path.read_text(encoding="utf-8"), str(path), "exec")
    notebook = json.loads((TOOLS / "prewise_vi_context_train_kaggle.ipynb").read_text(encoding="utf-8"))
    for idx, cell in enumerate(notebook.get("cells", [])):
        if cell.get("cell_type") == "code":
            compile("".join(cell.get("source", [])), f"notebook-cell-{idx}", "exec")

    summary = {
        "bundle": "prewise-vietnamese-context-v3-kaggle-ready",
        "validation": "PASS",
        "data_rows": json.loads((OUTPUT / "dataset_manifest.json").read_text(encoding="utf-8"))["coverage"],
        "trainer_validate_only": {"message_context": "PASS", "explanation": "PASS"},
        "gpu_training_executed": False,
    }
    (OUTPUT / "BUNDLE_SUMMARY.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    checksum_lines = []
    for path in sorted(p for p in OUTPUT.rglob("*") if p.is_file() and p.name != "checksums.sha256"):
        checksum_lines.append(
            f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.relative_to(OUTPUT).as_posix()}"
        )
    (OUTPUT / "checksums.sha256").write_text("\n".join(checksum_lines) + "\n", encoding="utf-8")

    if ARCHIVE.exists():
        ARCHIVE.unlink()
    with zipfile.ZipFile(ARCHIVE, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for path in sorted(p for p in OUTPUT.rglob("*") if p.is_file()):
            archive.write(
                path,
                arcname=f"prewise-vietnamese-context-v3/{path.relative_to(OUTPUT).as_posix()}",
            )

    print(json.dumps({
        "ok": True,
        "output": str(OUTPUT),
        "archive": str(ARCHIVE),
        "archive_bytes": ARCHIVE.stat().st_size,
        "archive_sha256": hashlib.sha256(ARCHIVE.read_bytes()).hexdigest(),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
