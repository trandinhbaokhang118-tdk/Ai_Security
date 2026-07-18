#!/usr/bin/env python3
"""Install the same 16-bit LoRA stack used by the bundled trainer."""
import shutil, subprocess, sys

def run(args):
    print('+', ' '.join(args)); subprocess.run(args, check=True)
run([sys.executable, '-m', 'pip', 'install', '--upgrade', '-q', 'uv'])
uv = shutil.which('uv')
if not uv: raise RuntimeError('uv not found')
base = [uv, 'pip', 'install', '-qqq']
run(base + ['torch==2.8.0', 'triton>=3.3.0', 'torchvision', 'bitsandbytes', 'xformers==0.0.32.post2',
            'unsloth_zoo[base] @ git+https://github.com/unslothai/unsloth-zoo',
            'unsloth[base] @ git+https://github.com/unslothai/unsloth'])
run(base + ['--no-deps', 'torchcodec==0.7.0'])
run(base + ['--upgrade', '--no-deps', 'tokenizers>=0.22.0,<=0.23.0', 'trl==0.22.2', 'unsloth', 'unsloth_zoo'])
run(base + ['transformers==5.2.0'])
run(base + ['--no-build-isolation', 'flash-linear-attention', 'causal_conv1d==1.6.0'])
run(base + ['--no-deps', '--upgrade', 'torchao>=0.16.0'])
print('INSTALLATION COMPLETE')
