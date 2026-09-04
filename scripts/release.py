#!/usr/bin/env python3
"""Regenerate QEVA exports, archive pages, and fixity manifests using only Python stdlib."""
from __future__ import annotations
import hashlib, html, json, re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
ARCHIVE=ROOT/'archive'; OBJECTS=ARCHIVE/'objects'
REF_RE=re.compile(r'^qeva:1:[a-z0-9][a-z0-9._-]*@[1-9][0-9]*$')
ID_RE=re.compile(r'^qeva:1:[a-z0-9][a-z0-9._-]*$')
REQUIRED={'qeva_version','id','revision','kind','title','summary','domains','context','assumptions','content','dependencies','relations','verification','provenance','supersedes','legacy_ids'}


def write_utf8(path,text):
    with path.open('w',encoding='utf-8',newline='\n') as f: f.write(text)

def write_ascii(path,text):
    with path.open('w',encoding='ascii',newline='\n') as f: f.write(text)

def canonical_bytes(obj):
    return (json.dumps(obj,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n').encode('utf-8')

def load_records():
    out=[]; seen=set()
    for path in sorted(OBJECTS.glob('*.json')):
        obj=json.loads(path.read_text(encoding='utf-8'))
        missing=REQUIRED-set(obj)
        if missing: raise SystemExit(f'{path}: missing {sorted(missing)}')
        key=(obj['id'],obj['revision'])
        if key in seen: raise SystemExit(f'duplicate record revision {key}')
        seen.add(key); out.append((path,obj))
    return out

def exact_ref(obj): return f"{obj['id']}@{obj['revision']}"
def digest(data,alg): return hashlib.new(alg,data).hexdigest()

def render_archive(records):
    articles=[]
    for path,o in sorted(records,key=lambda x:x[1]['title'].casefold()):
        searchable=' '.join([o['title'],o['summary'],o['kind'],*o['domains'],o['verification']['level']]).lower()
        deps=', '.join(o['dependencies']) or 'none declared'
        assumptions='; '.join(a['text']+(f" [{a['ref']}]" if a['ref'] else '') for a in o['assumptions']) or 'none declared'
        framework=o['context']['framework'] or 'context-specific / not singular'
        caveat=o['content']['caveat'] or 'none'
        example=o['content']['example'] or 'none'
        rels='; '.join(f"{r['kind']} → {r['target']}"+(f" ({r['note']})" if r['note'] else '') for r in o['relations']) or 'none'
        articles.append(f'''<article class="record" data-record="{html.escape(searchable,quote=True)}"><header><h2>{html.escape(o['title'])}</h2><span class="meta">{html.escape(o['kind'])} · {html.escape(o['verification']['level'])} · {html.escape(exact_ref(o))}</span></header><p>{html.escape(o['summary'])}</p><p class="tags">{' · '.join(map(html.escape,o['domains']))}</p><details><summary>Plain → exact → dependencies</summary><p><strong>Plain.</strong> {html.escape(o['content']['plain'])}</p><p><strong>Exact.</strong> {html.escape(o['content']['exact'])}</p><dl><dt>Framework</dt><dd>{html.escape(framework)}</dd><dt>Assumptions</dt><dd>{html.escape(assumptions)}</dd><dt>Dependencies</dt><dd>{html.escape(deps)}</dd><dt>Relations</dt><dd>{html.escape(rels)}</dd><dt>Example</dt><dd>{html.escape(example)}</dd><dt>Caveat</dt><dd>{html.escape(caveat)}</dd><dt>Verification</dt><dd>{html.escape(o['verification']['method'])}</dd></dl><p><a class="inline-link" href="objects/{html.escape(path.name)}">Raw JSON</a></p></details></article>''')
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="QEVA seed archive of explicit mathematical records, definitions, contexts, dependencies, and verification states."><title>QEVA Archive</title><link rel="icon" href="../assets/q.svg" type="image/svg+xml"><link rel="stylesheet" href="../assets/site.css"></head><body>
<header class="shell masthead"><a class="brand" href="../"><img src="../assets/q.svg" width="30" height="30" alt=""><span>QEVA</span></a><nav><a href="../map/">Map</a><a href="../sandbox/">Sandbox</a><a href="../history/">History</a><a href="./" aria-current="page">Archive</a><a href="../protocol/">Protocol</a></nav></header>
<main class="shell page"><header class="page-header"><p class="eyebrow">ARCHIVE · MACHINERY SEED</p><h1>Inspect the structure.</h1><p>Every entry exposes a plain explanation, exact formulation, context, assumptions, exact revision-pinned dependencies, relations, and the checking actually performed. The map is a navigational layer over these records.</p></header>
<section class="archive-search"><label class="sr-only" for="archive-q">Filter archive</label><input id="archive-q" data-archive-search type="search" placeholder="Filter by concept, domain, kind, or verification…" autocomplete="off"></section><p class="archive-help">JavaScript only filters this already-present page. Without JavaScript, all records remain readable; use your browser's Find command.</p>
<p class="notice"><strong>Scope boundary:</strong> this is not yet a recursively closed foundation of mathematics. Framework labels that lack a QEVA framework reference remain explicit external boundaries.</p>
<section class="records" aria-label="QEVA records">{''.join(articles)}</section>
<section class="doc" style="margin-top:3rem"><h2>Machine archive</h2><p><a class="inline-link" href="index.json">JSON index</a> · <a class="inline-link" href="CATALOG.tsv">TSV catalog</a> · <a class="inline-link" href="qeva.jsonl">Complete JSONL</a> · <a class="inline-link" href="../MANIFEST.sha256">SHA-256 manifest</a> · <a class="inline-link" href="../MANIFEST.sha512">SHA-512 manifest</a></p></section></main>
<footer class="shell footer"><span>{len(records)} records · Protocol 0.2</span><span><a href="qeva.jsonl">Download archive</a></span></footer><script src="../assets/archive.js"></script></body></html>'''

def write_manifests():
    excluded={'MANIFEST.sha256','MANIFEST.sha512'}
    files=[]
    for p in ROOT.rglob('*'):
        if not p.is_file(): continue
        rel=p.relative_to(ROOT).as_posix()
        if rel in excluded or rel.startswith('.git/'): continue
        files.append((rel,p))
    files.sort()
    for alg in ('sha256','sha512'):
        lines=[f"{digest(p.read_bytes(),alg)}  {rel}" for rel,p in files]
        write_ascii(ROOT/f'MANIFEST.{alg}','\n'.join(lines)+'\n')

def main():
    records=load_records()
    index=[]
    for path,o in records:
        b=canonical_bytes(o)
        index.append({'ref':exact_ref(o),'id':o['id'],'revision':o['revision'],'kind':o['kind'],'title':o['title'],'summary':o['summary'],'domains':o['domains'],'verification':o['verification']['level'],'path':str(path.relative_to(ARCHIVE)).replace('\\','/'),'sha256':digest(b,'sha256'),'sha512':digest(b,'sha512')})
    index.sort(key=lambda x:x['ref'])
    write_utf8(ARCHIVE/'index.json',json.dumps(index,ensure_ascii=False,indent=2)+'\n')
    with (ARCHIVE/'qeva.jsonl').open('wb') as f:
        for _,o in sorted(records,key=lambda x:exact_ref(x[1])): f.write(canonical_bytes(o))
    with (ARCHIVE/'CATALOG.tsv').open('w',encoding='utf-8',newline='\n') as f:
        f.write('ref\tkind\ttitle\tdomains\tverification\tpath\n')
        for x in index:
            clean=lambda s:str(s).replace('\t',' ').replace('\n',' ')
            f.write('\t'.join(map(clean,[x['ref'],x['kind'],x['title'],','.join(x['domains']),x['verification'],x['path']]))+'\n')
    write_utf8(ARCHIVE/'index.html',render_archive(records)+'\n')
    write_manifests()
    print(f'release: {len(records)} records; regenerated exports, archive page, and SHA-256/SHA-512 manifests')
if __name__=='__main__': main()
