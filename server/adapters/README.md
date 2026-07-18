# Adapter drop-in directory

Copy `manifest.example.json` to `manifest.json`, then place each PEFT LoRA
package at the relative `path` declared by its manifest entry. Every enabled
LoRA must contain `adapter_config.json` and either
`adapter_model.safetensors` or `adapter_model.bin`.

All LoRAs in one manifest must target the same `base_model`. See
[`docs/context-adapters.md`](../../docs/context-adapters.md) for deployment,
environment variables, fallback behavior, and phone-provider configuration.
