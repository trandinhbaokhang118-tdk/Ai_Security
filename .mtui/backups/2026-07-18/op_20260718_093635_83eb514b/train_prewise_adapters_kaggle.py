#!/usr/bin/env python3
"""Train one Prewise Qwen3.5-4B LoRA adapter on Kaggle T4 x2.

Run with torchrun for two GPUs, for example:

    torchrun --standalone --nproc_per_node=2 train_prewise_adapters_kaggle.py \
      --bundle-root /kaggle/input/prewise-training \
      --task message_context \
      --output-root /kaggle/working/prewise-adapters

The script intentionally uses 16-bit LoRA and refuses 4-bit QLoRA.
"""

from __future__ import annotations

import argparse
import gc
import inspect
import json
import os
import platform
import random
import shutil
import sys
import time
from pathlib import Path
from typing import Any

import torch
from datasets import Dataset, load_dataset

BASE_MODEL = "Qwen/Qwen3.5-4B"
TASKS: dict[str, dict[str, Any]] = {
    "message_context": {
        "dataset_dir": "message_context",
        "adapter_dir": "message-context-adapter",
        "served_model_name": "message-context-adapter",
        "adapter_id": "message-context-v1",
        "rank": 16,
        "alpha": 16,
        "default_max_samples": 55_000,
    },
    "web_context": {
        "dataset_dir": "web_context",
        "adapter_dir": "web-context-adapter",
        "served_model_name": "web-context-adapter",
        "adapter_id": "web-context-v1",
        "rank": 16,
        "alpha": 16,
        "default_max_samples": 24_000,
    },
    "explanation": {
        "dataset_dir": "explanation",
        "adapter_dir": "explanation-adapter",
        "served_model_name": "explanation-adapter",
        "adapter_id": "explanation-v1",
        "rank": 8,
        "alpha": 16,
        "default_max_samples": 30_000,
    },
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bundle-root", type=Path, required=True)
    parser.add_argument("--task", choices=sorted(TASKS), required=True)
    parser.add_argument("--output-root", type=Path, default=Path("/kaggle/working/prewise-adapters"))
    parser.add_argument("--model-name", default=BASE_MODEL)
    parser.add_argument("--max-seq-length", type=int, default=2048)
    parser.add_argument("--epochs", type=float, default=1.0)
    parser.add_argument("--learning-rate", type=float, default=2e-4)
    parser.add_argument("--per-device-batch-size", type=int, default=1)
    parser.add_argument("--gradient-accumulation-steps", type=int, default=8)
    parser.add_argument("--max-train-samples", type=int, default=0)
    parser.add_argument("--max-validation-samples", type=int, default=2000)
    parser.add_argument("--seed", type=int, default=3407)
    parser.add_argument("--logging-steps", type=int, default=10)
    parser.add_argument("--save-steps", type=int, default=250)
    parser.add_argument("--eval-steps", type=int, default=250)
    parser.add_argument("--warmup-ratio", type=float, default=0.03)
    parser.add_argument("--resume-from-checkpoint", default="")
    parser.add_argument("--smoke-test", action="store_true")
    parser.add_argument("--push-to-hub", action="store_true")
    parser.add_argument("--hub-model-id", default="")
    parser.add_argument("--hub-private", action="store_true")
    return parser.parse_args()


def is_main_process() -> bool:
    return int(os.environ.get("RANK", "0")) == 0


def world_size() -> int:
    return int(os.environ.get("WORLD_SIZE", "1"))


def barrier() -> None:
    if torch.distributed.is_available() and torch.distributed.is_initialized():
        torch.distributed.barrier()


def log(message: str) -> None:
    if is_main_process():
        print(message, flush=True)


def set_seed(seed: int) -> None:
    random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def load_bundle_dataset(bundle_root: Path, task: str) -> tuple[Dataset, Dataset, Dataset]:
    config = TASKS[task]
    directory = bundle_root / config["dataset_dir"]
    files = {
        "train": str(directory / "train.jsonl.gz"),
        "validation": str(directory / "validation.jsonl.gz"),
        "test": str(directory / "test.jsonl.gz"),
    }
    missing = [path for path in files.values() if not Path(path).is_file()]
    if missing:
        raise FileNotFoundError(f"Missing bundle files: {missing}")
    dataset = load_dataset("json", data_files=files)
    return dataset["train"], dataset["validation"], dataset["test"]


def apply_template(tokenizer: Any, messages: list[dict[str, str]], add_generation_prompt: bool = False) -> str:
    kwargs = {
        "tokenize": False,
        "add_generation_prompt": add_generation_prompt,
    }
    try:
        return tokenizer.apply_chat_template(messages, enable_thinking=False, **kwargs)
    except TypeError:
        return tokenizer.apply_chat_template(messages, **kwargs)


def prepare_text_dataset(
    dataset: Dataset,
    tokenizer: Any,
    max_seq_length: int,
    max_samples: int,
    seed: int,
    split_name: str,
) -> tuple[Dataset, dict[str, int]]:
    if max_samples > 0 and len(dataset) > max_samples:
        dataset = dataset.shuffle(seed=seed).select(range(max_samples))

    def render(batch: dict[str, list[Any]]) -> dict[str, list[Any]]:
        texts: list[str] = []
        lengths: list[int] = []
        valid: list[bool] = []
        for messages in batch["messages"]:
            text = apply_template(tokenizer, messages)
            token_ids = tokenizer(text, add_special_tokens=False, truncation=False)["input_ids"]
            texts.append(text)
            lengths.append(len(token_ids))
            valid.append(16 <= len(token_ids) <= max_seq_length)
        return {"text": texts, "token_length": lengths, "within_length": valid}

    rendered = dataset.map(
        render,
        batched=True,
        batch_size=128,
        num_proc=1,
        desc=f"Render {split_name}",
    )
    before = len(rendered)
    rendered = rendered.filter(
        lambda row: bool(row["within_length"]),
        num_proc=1,
        desc=f"Filter {split_name} by token length",
    )
    if not len(rendered):
        raise RuntimeError(f"No {split_name} examples fit max_seq_length={max_seq_length}")
    stats = {
        "before_length_filter": before,
        "after_length_filter": len(rendered),
        "dropped_over_or_under_length": before - len(rendered),
        "max_token_length": max(rendered["token_length"]),
        "min_token_length": min(rendered["token_length"]),
    }
    keep_columns = [column for column in rendered.column_names if column in {"text", "token_length"}]
    remove_columns = [column for column in rendered.column_names if column not in keep_columns]
    if remove_columns:
        rendered = rendered.remove_columns(remove_columns)
    return rendered, stats


def sft_config_kwargs(args: argparse.Namespace, output_dir: Path, use_bf16: bool) -> dict[str, Any]:
    from trl import SFTConfig

    parameters = inspect.signature(SFTConfig).parameters
    kwargs: dict[str, Any] = {
        "output_dir": str(output_dir),
        "num_train_epochs": args.epochs,
        "learning_rate": args.learning_rate,
        "per_device_train_batch_size": args.per_device_batch_size,
        "per_device_eval_batch_size": 1,
        "gradient_accumulation_steps": args.gradient_accumulation_steps,
        "warmup_ratio": args.warmup_ratio,
        "logging_steps": args.logging_steps,
        "save_steps": args.save_steps,
        "save_total_limit": 2,
        "eval_steps": args.eval_steps,
        "fp16": not use_bf16,
        "bf16": use_bf16,
        "optim": "adamw_8bit",
        "weight_decay": 0.01,
        "lr_scheduler_type": "cosine",
        "seed": args.seed,
        "data_seed": args.seed,
        "report_to": "none",
        "gradient_checkpointing": True,
        "remove_unused_columns": True,
        "dataset_num_proc": 1,
        "packing": True,
        "ddp_find_unused_parameters": False,
        "logging_first_step": True,
    }
    if "max_seq_length" in parameters:
        kwargs["max_seq_length"] = args.max_seq_length
    elif "max_length" in parameters:
        kwargs["max_length"] = args.max_seq_length
    if "eval_strategy" in parameters:
        kwargs["eval_strategy"] = "steps"
    elif "evaluation_strategy" in parameters:
        kwargs["evaluation_strategy"] = "steps"
    if args.push_to_hub:
        kwargs.update(
            {
                "push_to_hub": True,
                "hub_model_id": args.hub_model_id,
                "hub_private_repo": args.hub_private,
            }
        )
    return kwargs


def build_trainer(args: argparse.Namespace, train: Dataset, validation: Dataset, run_dir: Path) -> tuple[Any, Any, Any]:
    from unsloth import FastLanguageModel, is_bfloat16_supported
    from unsloth.chat_templates import train_on_responses_only
    from trl import SFTConfig, SFTTrainer

    if args.model_name != BASE_MODEL:
        raise ValueError(
            f"The backend manifest requires {BASE_MODEL!r}; received {args.model_name!r}. "
            "Change both only as one versioned migration."
        )
    if not torch.cuda.is_available():
        raise RuntimeError("A CUDA GPU is required. Use Kaggle T4 x2 or another supported GPU runtime.")

    log(f"Loading {args.model_name} in 16-bit LoRA mode on {world_size()} process(es)...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=args.model_name,
        max_seq_length=args.max_seq_length,
        load_in_4bit=False,
        load_in_8bit=False,
        load_in_16bit=True,
        full_finetuning=False,
        fast_inference=False,
    )
    task_config = TASKS[args.task]
    model = FastLanguageModel.get_peft_model(
        model,
        r=task_config["rank"],
        target_modules=[
            "q_proj", "k_proj", "v_proj", "o_proj",
            "gate_proj", "up_proj", "down_proj",
        ],
        lora_alpha=task_config["alpha"],
        lora_dropout=0,
        bias="none",
        use_gradient_checkpointing="unsloth",
        random_state=args.seed,
        use_rslora=False,
        loftq_config=None,
        max_seq_length=args.max_seq_length,
    )

    config = SFTConfig(**sft_config_kwargs(args, run_dir / "checkpoints", is_bfloat16_supported()))
    trainer_kwargs: dict[str, Any] = {
        "model": model,
        "train_dataset": train,
        "eval_dataset": validation,
        "args": config,
    }
    trainer_parameters = inspect.signature(SFTTrainer).parameters
    if "processing_class" in trainer_parameters:
        trainer_kwargs["processing_class"] = tokenizer
    else:
        trainer_kwargs["tokenizer"] = tokenizer
    trainer = SFTTrainer(**trainer_kwargs)

    # Qwen ChatML delimiters. This masks system/user tokens and computes loss only
    # on the strict JSON assistant response.
    trainer = train_on_responses_only(
        trainer,
        instruction_part="<|im_start|>user\n",
        response_part="<|im_start|>assistant\n",
    )
    return trainer, model, tokenizer


def smoke_test(model: Any, tokenizer: Any, validation_raw: Dataset, output_path: Path) -> dict[str, Any]:
    from unsloth import FastLanguageModel

    row = validation_raw[0]
    prompt_messages = row["messages"][:2]
    prompt = apply_template(tokenizer, prompt_messages, add_generation_prompt=True)
    FastLanguageModel.for_inference(model)
    encoded = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=2048)
    encoded = {key: value.to(model.device) for key, value in encoded.items()}
    with torch.inference_mode():
        generated = model.generate(
            **encoded,
            max_new_tokens=700,
            do_sample=False,
            temperature=None,
            top_p=None,
            use_cache=True,
        )
    completion = tokenizer.decode(
        generated[0][encoded["input_ids"].shape[-1] :],
        skip_special_tokens=True,
    ).strip()
    try:
        parsed = json.loads(completion.strip().removeprefix("```json").removesuffix("```").strip())
        strict_json = isinstance(parsed, dict)
    except json.JSONDecodeError:
        parsed = None
        strict_json = False
    report = {
        "strict_json": strict_json,
        "completion": completion,
        "parsed": parsed,
        "expected": json.loads(row["messages"][2]["content"]),
    }
    output_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return report


def write_adapter_manifest(output_root: Path) -> None:
    manifest = {
        "schema_version": "1",
        "base_model": BASE_MODEL,
        "base_revision": "pin-after-training",
        "context_length": 4096,
        "adapters": [
            {
                "adapter_id": config["adapter_id"],
                "task": f"{config['adapter_dir']}",
                "runtime": "openai_lora",
                "path": f"{config['adapter_dir']}/current",
                "served_model_name": config["served_model_name"],
                "enabled": True,
                "priority": 10,
                "timeout_seconds": 20 if key != "explanation" else 30,
            }
            for key, config in TASKS.items()
        ]
        + [
            {
                "adapter_id": "phone-provider-v1",
                "task": "phone-intelligence",
                "runtime": "http_json",
                "endpoint": "env:PHONE_INTELLIGENCE_URL",
                "enabled": False,
                "priority": 10,
                "timeout_seconds": 10,
            }
        ],
    }
    # The task values equal the adapter directory names by backend contract.
    (output_root / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def main() -> None:
    args = parse_args()
    set_seed(args.seed)
    bundle_root = args.bundle_root.resolve()
    output_root = args.output_root.resolve()
    task_config = TASKS[args.task]
    max_train_samples = args.max_train_samples or task_config["default_max_samples"]

    manifest = json.loads((bundle_root / "dataset_manifest.json").read_text(encoding="utf-8"))
    if manifest.get("base_model") != BASE_MODEL:
        raise ValueError("Dataset bundle base model does not match the backend manifest contract")

    raw_train, raw_validation, raw_test = load_bundle_dataset(bundle_root, args.task)
    log(
        f"Raw rows: train={len(raw_train)}, validation={len(raw_validation)}, test={len(raw_test)}"
    )

    # Token audit only needs the official tokenizer, not a second model copy.
    from transformers import AutoTokenizer

    log("Loading tokenizer for token audit...")
    tokenizer = AutoTokenizer.from_pretrained(args.model_name, trust_remote_code=True)
    train, train_stats = prepare_text_dataset(
        raw_train, tokenizer, args.max_seq_length, max_train_samples, args.seed, "train"
    )
    validation, validation_stats = prepare_text_dataset(
        raw_validation,
        tokenizer,
        args.max_seq_length,
        args.max_validation_samples,
        args.seed,
        "validation",
    )
    del model
    gc.collect()
    torch.cuda.empty_cache()
    barrier()

    run_dir = output_root / task_config["adapter_dir"]
    run_dir.mkdir(parents=True, exist_ok=True)
    trainer, model, tokenizer = build_trainer(args, train, validation, run_dir)

    started = time.time()
    resume = args.resume_from_checkpoint or None
    train_result = trainer.train(resume_from_checkpoint=resume)
    barrier()

    adapter_dir = run_dir / "current"
    if is_main_process():
        if adapter_dir.exists():
            shutil.rmtree(adapter_dir)
        adapter_dir.mkdir(parents=True, exist_ok=True)
        trainer.model.save_pretrained(adapter_dir, safe_serialization=True)
        tokenizer.save_pretrained(adapter_dir)
        adapter_config_path = adapter_dir / "adapter_config.json"
        adapter_config = json.loads(adapter_config_path.read_text(encoding="utf-8"))
        adapter_config["base_model_name_or_path"] = BASE_MODEL
        adapter_config_path.write_text(
            json.dumps(adapter_config, ensure_ascii=False, indent=2), encoding="utf-8"
        )

        metrics = dict(train_result.metrics)
        metrics.update(
            {
                "task": args.task,
                "base_model": BASE_MODEL,
                "world_size": world_size(),
                "elapsed_seconds": round(time.time() - started, 2),
                "train_rows": len(train),
                "validation_rows": len(validation),
                "test_rows_reserved": len(raw_test),
                "train_token_stats": train_stats,
                "validation_token_stats": validation_stats,
                "lora_rank": task_config["rank"],
                "lora_alpha": task_config["alpha"],
                "load_in_4bit": False,
                "precision": "bf16" if torch.cuda.is_bf16_supported() else "fp16",
                "python": sys.version,
                "platform": platform.platform(),
                "torch": torch.__version__,
                "cuda": torch.version.cuda,
                "gpus": [torch.cuda.get_device_name(index) for index in range(torch.cuda.device_count())],
            }
        )
        (run_dir / "training_report.json").write_text(
            json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        write_adapter_manifest(output_root)
        if args.smoke_test:
            smoke = smoke_test(model, tokenizer, raw_validation, run_dir / "smoke_inference.json")
            log(f"Smoke strict JSON: {smoke['strict_json']}")
        if args.push_to_hub:
            if not args.hub_model_id:
                raise ValueError("--hub-model-id is required with --push-to-hub")
            trainer.push_to_hub()
        log(f"Adapter saved to {adapter_dir}")

    barrier()


if __name__ == "__main__":
    main()
