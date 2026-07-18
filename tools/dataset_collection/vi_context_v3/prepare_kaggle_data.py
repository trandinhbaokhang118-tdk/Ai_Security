#!/usr/bin/env python3
from __future__ import annotations
import argparse, gzip, shutil
from pathlib import Path


def gunzip(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(src, 'rb') as inp, dst.open('wb') as out:
        shutil.copyfileobj(inp, out, length=1024 * 1024)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument('--bundle-root', type=Path, required=True)
    p.add_argument('--output-root', type=Path, default=Path('/kaggle/working/prewise-data'))
    args = p.parse_args()
    for task in ('message_context', 'explanation'):
        for split in ('train', 'validation', 'test'):
            src = args.bundle_root / task / f'{split}.jsonl.gz'
            if not src.exists():
                raise FileNotFoundError(src)
            dst = args.output_root / task / f'{split}.jsonl'
            gunzip(src, dst)
            print(f'{src} -> {dst} ({dst.stat().st_size} bytes)')

if __name__ == '__main__':
    main()
