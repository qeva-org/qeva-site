#!/usr/bin/env python3
"""Check the outer deployment contract and run the existing three verification tiers."""
from __future__ import annotations
import argparse
import importlib.util
import json
import os
import subprocess
import sys
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]

def load(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

def check_outer() -> None:
    config = json.loads((ROOT / 'vercel.json').read_text(encoding='utf-8'))
    assert config.get('outputDirectory') == 'dist', 'Vercel must publish dist/'
    assert config.get('framework') is None, 'Static site must not acquire a framework assumption'
    assert config.get('buildCommand') is None, 'No framework build command is required'
    assert (ROOT / 'dist/index.html').is_file(), 'Missing public homepage'
    hosting = json.loads((ROOT / '.openai/hosting.json').read_text(encoding='utf-8'))
    assert hosting['static']['directory'] == 'dist', 'Hosting configurations disagree'
    package = load(ROOT / 'scripts/package_release.py', 'qeva_packager')
    paths = {p.as_posix() for p in package.collect()}
    for required in ('vercel.json', '.openai/hosting.json', 'dist/index.html', 'scripts/check_project.py', 'branding/qeva-logo-original.png'):
        assert required in paths, f'Release packager omitted {required}'
    for unsafe in ('.env', '.env.staging', 'private/export.json', 'runtime/jobs.json', 'id_ed25519', 'credentials.json', 'key.pem', '../escape', 'C:/escape', r'folder\escape'):
        try:
            package.validate_relative(Path(unsafe))
        except SystemExit:
            pass
        else:
            raise AssertionError(f'Unsafe package path accepted: {unsafe}')
    package.validate_relative(Path('.env.example'))
    h = load(ROOT / 'dist/harvester/harvest.py', 'qeva_harvester_dates')
    for values, expected in [([1905],'1905'),([1905,6],'1905-06'),([1905,6,30],'1905-06-30'),([2000,2,29],'2000-02-29'),([1900,2,29],None),([2026,13],None),([],None),([2026,True],None),(['2026'],None),([0],None)]:
        assert h.iso_from_parts({'date-parts':[values]}) == expected, f'Date precision regression: {values}'
    assert '"per-page": min(100,' in (ROOT / 'dist/harvester/harvest.py').read_text(), 'OpenAlex page-size contract changed; review current primary documentation'
    trace = json.loads((ROOT / 'docs/todo-traceability.json').read_text(encoding='utf-8'))
    import re
    source = (ROOT / 'docs/QEVA_MASTER_TODO_v2_DIGITAL_CIVILIZATION.md').read_text(encoding='utf-8')
    original = [(i, m.group(1)) for i, line in enumerate(source.splitlines(), 1) if (m := re.match(r'^\s*(?:-\s+|\d+\.\s+)\[[ xX]\]\s*(.*)$', line))]
    actual = [(item['source_line'], item['source_text']) for item in trace['items']]
    assert len(actual) == 560 and original == actual, 'TODO traceability lost or changed an original item'
    assert len({item['id'] for item in trace['items']}) == 560
    print('Outer project: deployment paths, packaging coverage, credential path guards and 10 date-precision cases passed.', flush=True)

def main() -> None:
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--outer-only', action='store_true')
    args=parser.parse_args()
    check_outer()
    if args.outer_only:
        return
    env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1')
    for command in ([sys.executable, '-B', 'scripts/verify.py'], [sys.executable, '-B', 'scripts/test_harvester.py'], ['node', 'scripts/test_lab_records.mjs']):
        subprocess.run(command, cwd=ROOT / 'dist', env=env, check=True)
    print('QEVA project checks passed.')

if __name__ == '__main__':
    main()
