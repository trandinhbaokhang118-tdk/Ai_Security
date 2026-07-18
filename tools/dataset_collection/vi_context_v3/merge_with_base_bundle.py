#!/usr/bin/env python3
"""Merge the Vietnamese supplement with the existing Prewise bundle on Kaggle.

The base bundle may contain message_context, web_context, and explanation.
The supplement adds Vietnamese message_context and explanation rows. Family hashes
remain split-safe. Files are streamed; no full corpus is loaded into RAM.
"""
from __future__ import annotations
import argparse, gzip, hashlib, json, shutil
from pathlib import Path
from collections import Counter


def iter_rows(path: Path):
    opener = gzip.open if path.suffix == '.gz' else open
    mode = 'rt'
    with opener(path, mode, encoding='utf-8') as f:
        for line in f:
            if line.strip():
                yield json.loads(line)


def write_rows(path: Path, sources: list[Path]):
    path.parent.mkdir(parents=True, exist_ok=True)
    seen = set(); count = 0; labels = Counter(); digest = hashlib.sha256()
    with gzip.open(path, 'wt', encoding='utf-8', newline='\n', compresslevel=6) as out:
        for src in sources:
            if not src.exists():
                continue
            for row in iter_rows(src):
                key = (row.get('task'), row.get('family_hash'), json.dumps(row.get('messages', []), ensure_ascii=False, sort_keys=True))
                key_hash = hashlib.sha256(repr(key).encode('utf-8')).hexdigest()
                if key_hash in seen:
                    continue
                seen.add(key_hash)
                line = json.dumps(row, ensure_ascii=False, separators=(',', ':')) + '\n'
                digest.update(line.encode('utf-8')); out.write(line)
                count += 1; labels[str(row.get('label', ''))] += 1
    return {'rows': count, 'compressed_bytes': path.stat().st_size, 'uncompressed_sha256': digest.hexdigest(), 'labels': dict(labels)}


def find_split(root: Path, task: str, split: str):
    for suffix in ('.jsonl.gz', '.jsonl'):
        p = root / task / f'{split}{suffix}'
        if p.exists(): return p
    return root / task / f'{split}.jsonl.gz'


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--base-bundle', type=Path, required=True)
    p.add_argument('--supplement-bundle', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    args = p.parse_args(); args.output.mkdir(parents=True, exist_ok=True)
    manifest = {'schema_version': '2', 'bundle_name': 'prewise-qwen35-multilingual-context-v2', 'base_model': 'Qwen/Qwen3.5-4B', 'datasets': {}}
    for task in ('message_context', 'explanation'):
        entry = {'splits': {}}
        for split in ('train','validation','test'):
            dest = args.output / task / f'{split}.jsonl.gz'
            info = write_rows(dest, [find_split(args.base_bundle, task, split), find_split(args.supplement_bundle, task, split)])
            info['file'] = f'{task}/{split}.jsonl.gz'; entry['splits'][split] = info
        manifest['datasets'][task] = entry
    # Web context is copied unchanged from base bundle.
    web_src = args.base_bundle / 'web_context'
    if web_src.exists():
        shutil.copytree(web_src, args.output / 'web_context', dirs_exist_ok=True)
        entry = {'splits': {}}
        for split in ('train','validation','test'):
            pth = find_split(args.output, 'web_context', split)
            if pth.exists():
                count = sum(1 for _ in iter_rows(pth))
                entry['splits'][split] = {'rows': count, 'file': str(pth.relative_to(args.output)).replace('\\','/'), 'compressed_bytes': pth.stat().st_size}
        manifest['datasets']['web_context'] = entry
    (args.output / 'dataset_manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(manifest, ensure_ascii=False, indent=2))

if __name__ == '__main__': main()
