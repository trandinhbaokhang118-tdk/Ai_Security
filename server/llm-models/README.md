# Prewise LLM drop-in directory

Copy one deployable model package to `server/llm-models/current/`. The directory
is mounted read-only at `/models/current` by `docker-compose.ai.yml`.

## Preferred: merged Hugging Face CausalLM

Required files:

- `config.json`
- tokenizer files (`tokenizer.json` or the tokenizer-specific equivalent)
- one or more `*.safetensors` weight files
- optional `generation_config.json`
- optional `model-manifest.json`

## Supported: PEFT LoRA adapter

Required files:

- `adapter_config.json`
- `adapter_model.safetensors`
- `model-manifest.json` with a `base_model` value, unless
  `adapter_config.json` already contains `base_model_name_or_path`

The API-facing model name remains `prewise-security-v1`, so replacing the
contents of `current/` does not require frontend or backend changes.
