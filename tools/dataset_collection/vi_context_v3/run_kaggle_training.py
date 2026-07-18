#!/usr/bin/env python3
from __future__ import annotations
import argparse, os, shutil, subprocess, sys
from pathlib import Path


def gpu_count() -> int:
    if not shutil.which('nvidia-smi'):
        return 0
    try:
        return len([x for x in subprocess.check_output(['nvidia-smi','-L'], text=True).splitlines() if x.strip()])
    except Exception:
        return 1


def main():
    p=argparse.ArgumentParser()
    p.add_argument('--bundle-root', type=Path, required=True)
    p.add_argument('--data-root', type=Path, required=True)
    p.add_argument('--output-root', type=Path, default=Path('/kaggle/working/prewise-v3'))
    p.add_argument('--model-name', default='Qwen/Qwen3.5-4B')
    p.add_argument('--message-train-samples', type=int, default=32799)
    p.add_argument('--explanation-train-samples', type=int, default=24000)
    p.add_argument('--validation-samples', type=int, default=2400)
    args=p.parse_args()
    trainer=str(args.bundle_root/'train_qwen35_4b_context_kaggle.py')
    msg_out=args.output_root/'message-context-output'
    exp_out=args.output_root/'explanation-output'
    common=['--model-name',args.model_name,'--max-seq-length','2048','--epochs','1','--batch-size','1','--gradient-accumulation-steps','8','--expect-json','--dataset-num-proc','2']
    msg=[sys.executable,trainer,'--train-file',str(args.data_root/'message_context/train.jsonl'),'--validation-file',str(args.data_root/'message_context/validation.jsonl'),'--output-dir',str(msg_out),'--max-train-samples',str(args.message_train_samples),'--max-validation-samples',str(args.validation_samples),*common]
    exp=[sys.executable,trainer,'--train-file',str(args.data_root/'explanation/train.jsonl'),'--validation-file',str(args.data_root/'explanation/validation.jsonl'),'--output-dir',str(exp_out),'--max-train-samples',str(args.explanation_train_samples),'--max-validation-samples',str(args.validation_samples),*common]
    n=gpu_count(); print('Detected GPUs:',n,flush=True)
    if n>=2:
        env0=os.environ.copy(); env0['CUDA_VISIBLE_DEVICES']='0'
        env1=os.environ.copy(); env1['CUDA_VISIBLE_DEVICES']='1'
        args.output_root.mkdir(parents=True,exist_ok=True)
        with (args.output_root/'message-train.log').open('w',encoding='utf-8') as l0, (args.output_root/'explanation-train.log').open('w',encoding='utf-8') as l1:
            p0=subprocess.Popen(msg,env=env0,stdout=l0,stderr=subprocess.STDOUT,text=True)
            p1=subprocess.Popen(exp,env=env1,stdout=l1,stderr=subprocess.STDOUT,text=True)
            rc0,rc1=p0.wait(),p1.wait()
        if rc0 or rc1:
            raise RuntimeError(f'training failed: message={rc0}, explanation={rc1}; inspect logs in {args.output_root}')
    elif n==1:
        subprocess.run(msg,check=True); subprocess.run(exp,check=True)
    else:
        raise RuntimeError('No CUDA GPU found')
    package=args.output_root/'server-adapters'
    subprocess.run([sys.executable,str(args.bundle_root/'package_adapters.py'),'--message-output',str(msg_out),'--explanation-output',str(exp_out),'--package-root',str(package),'--base-model',args.model_name],check=True)
    archive=shutil.make_archive('/kaggle/working/prewise-adapters-v3','zip',root_dir=package)
    print('READY:',archive)

if __name__=='__main__': main()
