#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, shutil
from pathlib import Path

def copy_adapter(src: Path, dst: Path):
    adapter = src / 'adapter'
    if not (adapter / 'adapter_config.json').exists():
        raise FileNotFoundError(adapter / 'adapter_config.json')
    if not any((adapter / n).exists() for n in ('adapter_model.safetensors','adapter_model.bin')):
        raise FileNotFoundError(f'No adapter weights in {adapter}')
    shutil.copytree(adapter, dst, dirs_exist_ok=True)

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--message-output', type=Path, required=True)
    p.add_argument('--explanation-output', type=Path, required=True)
    p.add_argument('--package-root', type=Path, required=True)
    p.add_argument('--base-model', default='Qwen/Qwen3.5-4B')
    a=p.parse_args(); root=a.package_root
    copy_adapter(a.message_output, root/'message-context-adapter'/'current')
    copy_adapter(a.explanation_output, root/'explanation-adapter'/'current')
    manifest={
      'schema_version':'1','base_model':a.base_model,'base_revision':'','context_length':4096,
      'adapters':[
        {'adapter_id':'message-context-vi-v3','task':'message-context-adapter','runtime':'openai_lora','path':'message-context-adapter/current','served_model_name':'message-context-adapter','enabled':True,'priority':10,'timeout_seconds':15},
        {'adapter_id':'explanation-vi-v3','task':'explanation-adapter','runtime':'openai_lora','path':'explanation-adapter/current','served_model_name':'explanation-adapter','enabled':True,'priority':10,'timeout_seconds':30},
      ]}
    (root/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(manifest,ensure_ascii=False,indent=2))
if __name__=='__main__': main()
