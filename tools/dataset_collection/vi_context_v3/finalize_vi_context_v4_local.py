#!/usr/bin/env python3
from __future__ import annotations

import gzip
import hashlib
import json
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
DATA_ROOT = Path(r"C:\NDT\PJ\prewise-datasets")
OUTPUT = DATA_ROOT / "prewise-vietnamese-context-v4"
ARCHIVE = DATA_ROOT / "prewise-vietnamese-context-v4-kaggle-ready.zip"
TEMP = DATA_ROOT / "_prewise-v4-validate-temp"


def run(args: list[object], cwd: Path | None = None) -> None:
    print("+", " ".join(str(item) for item in args), flush=True)
    subprocess.run([str(item) for item in args], cwd=str(cwd or TOOLS), check=True)


def gunzip(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(source, "rb") as src, destination.open("wb") as dst:
        shutil.copyfileobj(src, dst, length=1024 * 1024)


def create_sample() -> None:
    source = OUTPUT / "message_context" / "train.jsonl.gz"
    selected = None
    with gzip.open(source, "rt", encoding="utf-8") as handle:
        for line in handle:
            row = json.loads(line)
            user = row["messages"][1]["content"]
            payload = json.loads(
                user.split("UNTRUSTED_DATA_JSON_BEGIN\n", 1)[1].rsplit(
                    "\nUNTRUSTED_DATA_JSON_END", 1
                )[0]
            )
            metadata = payload["metadata"]
            if (
                metadata["scenario_family"] == "fake_boss_transfer"
                and metadata["template_index"] == 2
                and payload["modality"] == "email"
            ):
                selected = {
                    "row_metadata": {
                        key: row[key]
                        for key in (
                            "task",
                            "source_id",
                            "quality_tier",
                            "family_hash",
                            "case_id",
                            "label",
                            "language",
                        )
                    },
                    "input": payload,
                    "expected_output": json.loads(row["messages"][2]["content"]),
                }
                break
    if selected is None:
        raise RuntimeError("Could not select audited fake_boss_transfer email sample")
    (OUTPUT / "SAMPLE_EMAIL_VI.json").write_text(
        json.dumps(selected, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def create_readme() -> None:
    text = """# Prewise Vietnamese Context v4 — Kaggle Ready

Bản v4 thay thế v2/v3 cho huấn luyện mới.

## Điểm đã sửa

- Finding được khóa theo từng `scenario_family + template_index`, không dùng một bộ finding chung cho cả ba template.
- `user_context.relationship` cố định theo đúng tình huống.
- `user_action_taken` chỉ được sinh khi nội dung có hành động tương ứng.
- Evidence trỏ đúng `content`, `metadata.conversation[index]` hoặc trường user context có liên quan.
- Message và Explanation khớp bằng `case_id`.
- Validation kiểm tra duplicate prompt, family leakage, citation, alignment và semantic contract.

## Kaggle

1. Upload toàn bộ thư mục hoặc ZIP này thành Kaggle Dataset.
2. Tạo Kaggle Notebook, chọn GPU T4 x2.
3. Mở `prewise_vi_context_train_kaggle_v4.ipynb`.
4. Run All.
5. Lấy `/kaggle/working/prewise-adapters-v4.zip`.

Base model: `Qwen/Qwen3.5-4B`.

## Lưu ý

Đây là dữ liệu synthetic có kiểm soát để bootstrap. Không thay thế test set tiếng Việt độc lập do con người kiểm duyệt. GPU fine-tune chưa được chạy trong bước đóng gói local.
"""
    (OUTPUT / "README.md").write_text(text, encoding="utf-8")


def compile_notebook(path: Path) -> None:
    notebook = json.loads(path.read_text(encoding="utf-8"))
    for index, cell in enumerate(notebook.get("cells", [])):
        if cell.get("cell_type") == "code":
            compile("".join(cell.get("source", [])), f"{path.name}:cell-{index}", "exec")


def main() -> None:
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    if TEMP.exists():
        shutil.rmtree(TEMP)
    if ARCHIVE.exists():
        ARCHIVE.unlink()

    run([
        sys.executable,
        TOOLS / "build_vi_context_bundle_v4.py",
        "--output",
        OUTPUT,
        "--variants-per-family",
        "80",
    ])
    run([
        sys.executable,
        TOOLS / "validate_vi_context_bundle_v4.py",
        "--bundle-root",
        OUTPUT,
    ])

    support_files = [
        "build_vi_context_bundle_v2_base.py",
        "build_vi_context_bundle_v3.py",
        "build_vi_context_bundle_v4.py",
        "validate_vi_context_bundle_v3.py",
        "validate_vi_context_bundle_v4.py",
        "train_qwen35_4b_context_kaggle.py",
        "prepare_kaggle_data.py",
        "install_kaggle_deps.py",
        "run_kaggle_training_v4.py",
        "package_adapters.py",
        "merge_with_base_bundle.py",
        "prewise_vi_context_train_kaggle_v4.ipynb",
        "SOURCE_NOTES.md",
    ]
    for name in support_files:
        shutil.copy2(TOOLS / name, OUTPUT / name)

    create_readme()
    create_sample()

    validation_status: dict[str, str] = {}
    for task in ("message_context", "explanation"):
        for split in ("train", "validation"):
            gunzip(
                OUTPUT / task / f"{split}.jsonl.gz",
                TEMP / task / f"{split}.jsonl",
            )
        run([
            sys.executable,
            TOOLS / "train_qwen35_4b_context_kaggle.py",
            "--train-file",
            TEMP / task / "train.jsonl",
            "--validation-file",
            TEMP / task / "validation.jsonl",
            "--output-dir",
            TEMP / f"validate-{task}",
            "--expect-json",
            "--validate-only",
        ])
        validation_status[task] = "PASS"
    shutil.rmtree(TEMP, ignore_errors=True)

    for path in TOOLS.glob("*.py"):
        compile(path.read_text(encoding="utf-8"), str(path), "exec")
    compile_notebook(OUTPUT / "prewise_vi_context_train_kaggle_v4.ipynb")

    manifest = json.loads((OUTPUT / "dataset_manifest.json").read_text(encoding="utf-8"))
    report = json.loads((OUTPUT / "validation_report.json").read_text(encoding="utf-8"))
    summary = {
        "bundle": "prewise-vietnamese-context-v4-kaggle-ready",
        "schema_version": "4",
        "validation": "PASS",
        "semantic_validation": report["semantic_validation"],
        "coverage": manifest["coverage"],
        "trainer_validate_only": validation_status,
        "notebook_compile": "PASS",
        "gpu_training_executed": False,
        "supersedes": [
            "prewise-vietnamese-context-v2",
            "prewise-vietnamese-context-v3",
        ],
    }
    (OUTPUT / "BUNDLE_SUMMARY.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    with zipfile.ZipFile(ARCHIVE, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for path in sorted(item for item in OUTPUT.rglob("*") if item.is_file()):
            archive.write(
                path,
                arcname=f"prewise-vietnamese-context-v4/{path.relative_to(OUTPUT).as_posix()}",
            )

    archive_hash = hashlib.sha256(ARCHIVE.read_bytes()).hexdigest()
    result = {
        "ok": True,
        "output": str(OUTPUT),
        "archive": str(ARCHIVE),
        "archive_bytes": ARCHIVE.stat().st_size,
        "archive_sha256": archive_hash,
        "free_gb": round(shutil.disk_usage(DATA_ROOT).free / (1024 ** 3), 2),
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
