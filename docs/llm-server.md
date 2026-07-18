# Prewise standalone AI server

This harness runs the generative explanation model independently from the local
Next.js and FastAPI applications. It exposes an OpenAI-compatible API backed by
vLLM, so replacing the trained model does not change the application contract.

## 1. Model handoff contract

The training owner must deliver either a merged Hugging Face `CausalLM` package
or a PEFT LoRA adapter. A sequence classifier or ONNX risk model is not a chat
LLM and cannot be served through this harness.

Copy the package contents into:

```text
server/llm-models/current/
```

See `server/llm-models/README.md` and `model-manifest.example.json` for the
required files. Model weights in this directory are intentionally ignored by
Git.

## 2. Start on the GPU machine

Prerequisites are Docker, Docker Compose, the NVIDIA driver, and NVIDIA
Container Toolkit. Set a secret before binding the server publicly:

```powershell
$env:LLM_API_KEY = "replace-with-a-long-random-secret"
$env:LLM_MODEL = "prewise-security-v1"
docker compose -f docker-compose.ai.yml up --build
```

The host exposes the server on port `8001`; the container listens on `8000`.
Put HTTPS/TLS at the GPU provider ingress or a reverse proxy. Do not expose an
unauthenticated vLLM port to the internet.

For a LoRA adapter whose base model is private, also set `HF_TOKEN`. The harness
uses `base_model_name_or_path` from `adapter_config.json` or `base_model` from
`model-manifest.json`. `LLM_BASE_MODEL` can override either value.

Useful optional settings:

```env
LLM_MAX_MODEL_LEN=4096
LLM_GPU_MEMORY_UTILIZATION=0.90
LLM_TENSOR_PARALLEL_SIZE=1
LLM_DTYPE=auto
LLM_QUANTIZATION=
LLM_VLLM_EXTRA_ARGS=
```

## 3. Verify the GPU server

From any machine allowed to access the endpoint:

```powershell
$env:LLM_BASE_URL = "https://gpu.example.com/v1"
$env:LLM_API_KEY = "the-same-secret"
$env:LLM_MODEL = "prewise-security-v1"
python -m ai_server.smoke_test
```

The smoke test lists models and sends a small chat-completion request.

## 4. Connect the local backend

Set these values in the repository root `.env` and restart FastAPI:

```env
LLM_BASE_URL=https://gpu.example.com/v1
LLM_API_KEY=the-same-secret
LLM_MODEL=prewise-security-v1
LLM_TIMEOUT_SECONDS=90
LLM_MAX_TOKENS=500
```

The browser never receives `LLM_API_KEY`. The local backend sanitizes evidence,
calls the remote server, streams tokens through `/v1/chat`, and uses a local
deterministic fallback whenever the GPU service is unavailable.

For a same-machine test, use `http://127.0.0.1:8001/v1` as `LLM_BASE_URL`.

## 5. Replace a model

1. Stop `docker-compose.ai.yml`.
2. Replace only the contents of `server/llm-models/current/`.
3. Keep `LLM_MODEL=prewise-security-v1` unless the API contract intentionally changes.
4. Start the compose service and run the smoke test.
5. Record the model manifest and evaluation result outside the ignored weights directory.

No frontend or local backend code change is required when the served model name
and OpenAI-compatible contract remain stable.
