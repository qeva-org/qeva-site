#!/usr/bin/env python3
"""Audit QEVA release structure, references, exports, manifests, and local links with Python stdlib."""
from __future__ import annotations
import hashlib, json, re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT=Path(__file__).resolve().parents[1]; ARCHIVE=ROOT/'archive'; OBJECTS=ARCHIVE/'objects'
ID_RE=re.compile(r'^qeva:1:[a-z0-9][a-z0-9._-]*$'); REF_RE=re.compile(r'^(qeva:1:[a-z0-9][a-z0-9._-]*)@([1-9][0-9]*)$')
KINDS=re.compile(r'^[a-z][a-z0-9-]*$')
REQ={'qeva_version','id','revision','kind','title','summary','domains','context','assumptions','content','dependencies','relations','verification','provenance','supersedes','legacy_ids'}

def fail(msg): raise SystemExit('verify: FAIL: '+msg)
def expect(c,msg):
    if not c: fail(msg)
def is_str(x): return isinstance(x,str) and bool(x)
def exact(o): return f"{o['id']}@{o['revision']}"

def validate_record(path,o):
    expect(isinstance(o,dict),f'{path.name}: record not object')
    expect(set(o)==REQ,f'{path.name}: fields differ from protocol; missing={REQ-set(o)} extra={set(o)-REQ}')
    expect(o['qeva_version']=='0.2',f'{path.name}: protocol != 0.2')
    expect(is_str(o['id']) and ID_RE.fullmatch(o['id']),f'{path.name}: bad id')
    expect(type(o['revision']) is int and o['revision']>=1,f'{path.name}: bad revision')
    expect(is_str(o['kind']) and KINDS.fullmatch(o['kind']),f'{path.name}: bad kind')
    expect(is_str(o['title']) and is_str(o['summary']),f'{path.name}: empty title/summary')
    expect(isinstance(o['domains'],list) and o['domains'] and len(o['domains'])==len(set(o['domains'])) and all(is_str(x) for x in o['domains']),f'{path.name}: bad domains')
    c=o['context']; expect(set(c)=={'framework','framework_ref','note'},f'{path.name}: bad context fields')
    expect(c['framework'] is None or isinstance(c['framework'],str),f'{path.name}: bad context framework')
    expect(c['framework_ref'] is None or REF_RE.fullmatch(c['framework_ref']),f'{path.name}: bad framework_ref')
    expect(c['note'] is None or isinstance(c['note'],str),f'{path.name}: bad context note')
    expect(isinstance(o['assumptions'],list),f'{path.name}: assumptions not list')
    for a in o['assumptions']:
        expect(isinstance(a,dict) and set(a)=={'text','ref'} and is_str(a['text']),f'{path.name}: bad assumption')
        expect(a['ref'] is None or REF_RE.fullmatch(a['ref']),f'{path.name}: bad assumption ref')
    ct=o['content']; expect(set(ct)=={'plain','exact','example','caveat'} and is_str(ct['plain']) and is_str(ct['exact']),f'{path.name}: bad content')
    expect(ct['example'] is None or isinstance(ct['example'],str),f'{path.name}: bad example')
    expect(ct['caveat'] is None or isinstance(ct['caveat'],str),f'{path.name}: bad caveat')
    expect(isinstance(o['dependencies'],list) and len(o['dependencies'])==len(set(o['dependencies'])) and all(REF_RE.fullmatch(x) for x in o['dependencies']),f'{path.name}: bad dependency refs')
    expect(isinstance(o['relations'],list),f'{path.name}: relations not list')
    for r in o['relations']:
        expect(isinstance(r,dict) and set(r)=={'kind','target','note'} and is_str(r['kind']) and KINDS.fullmatch(r['kind']) and REF_RE.fullmatch(r['target']),f'{path.name}: bad relation')
        expect(r['note'] is None or isinstance(r['note'],str),f'{path.name}: bad relation note')
    v=o['verification']; expect(set(v)=={'level','method','artifact'} and v['level'] in {'unreviewed','editorial','formal-proof','machine-checked','refuted'} and is_str(v['method']),f'{path.name}: bad verification')
    expect(v['artifact'] is None or isinstance(v['artifact'],str),f'{path.name}: bad artifact')
    p=o['provenance']; expect(set(p)=={'created','creator','license','source_note'} and re.fullmatch(r'[0-9]{4}-[0-9]{2}-[0-9]{2}',p['created']) and is_str(p['creator']) and is_str(p['license']),f'{path.name}: bad provenance')
    expect(p['source_note'] is None or isinstance(p['source_note'],str),f'{path.name}: bad source note')
    expect(o['supersedes'] is None or REF_RE.fullmatch(o['supersedes']),f'{path.name}: bad supersedes')
    expect(isinstance(o['legacy_ids'],list) and len(o['legacy_ids'])==len(set(o['legacy_ids'])) and all(isinstance(x,str) for x in o['legacy_ids']),f'{path.name}: bad legacy_ids')

def verify_records():
    records=[]; refs={}
    for path in sorted(OBJECTS.glob('*.json')):
        try:o=json.loads(path.read_text(encoding='utf-8'))
        except Exception as e: fail(f'{path.name}: invalid JSON: {e}')
        validate_record(path,o)
        r=exact(o); expect(r not in refs,f'duplicate exact ref {r}'); refs[r]=o; records.append((path,o))
        expect(o['provenance']['license']=='CC0-1.0',f'{path.name}: unexpected archive license')
    for path,o in records:
        internal=list(o['dependencies'])
        internal += [x['target'] for x in o['relations']]
        internal += [x['ref'] for x in o['assumptions'] if x['ref']]
        if o['context']['framework_ref']: internal.append(o['context']['framework_ref'])
        if o['supersedes']: internal.append(o['supersedes'])
        for r in internal: expect(r in refs,f'{path.name}: unresolved exact ref {r}')
        if o['supersedes']:
            prev=refs[o['supersedes']]; expect(prev['id']==o['id'] and prev['revision']<o['revision'],f'{path.name}: supersedes wrong logical object/revision')
    # generated exports must be byte-for-byte derivable
    canon=lambda o:(json.dumps(o,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n').encode('utf-8')
    expected=b''.join(canon(o) for _,o in sorted(records,key=lambda x:exact(x[1])))
    expect((ARCHIVE/'qeva.jsonl').read_bytes()==expected,'qeva.jsonl is not canonical export of objects/')
    idx=json.loads((ARCHIVE/'index.json').read_text(encoding='utf-8')); expect(len(idx)==len(records),'index.json record count mismatch')
    expect({x['ref'] for x in idx}==set(refs),'index.json refs mismatch objects/')
    return records

def verify_manifest(name,alg):
    path=ROOT/name; expect(path.is_file(),f'missing {name}')
    listed=set()
    for n,line in enumerate(path.read_text(encoding='ascii').splitlines(),1):
        if not line: continue
        try:wanted,rel=line.split('  ',1)
        except ValueError: fail(f'{name}:{n}: malformed')
        expect(rel not in listed,f'{name}: duplicate {rel}'); listed.add(rel)
        p=ROOT/rel; expect(p.is_file(),f'{name}: missing file {rel}')
        got=hashlib.new(alg,p.read_bytes()).hexdigest(); expect(got==wanted,f'{name}: digest mismatch {rel}')
    expected={p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*') if p.is_file() and p.relative_to(ROOT).as_posix() not in {'MANIFEST.sha256','MANIFEST.sha512'} and not p.relative_to(ROOT).as_posix().startswith('.git/')}
    expect(listed==expected,f'{name}: manifest coverage differs; missing={sorted(expected-listed)} extra={sorted(listed-expected)}')

class Links(HTMLParser):
    def __init__(self): super().__init__(); self.links=[]
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        for key in ('href','src'):
            if key in d: self.links.append(d[key])

def verify_local_links():
    for page in ROOT.rglob('*.html'):
        parser=Links(); parser.feed(page.read_text(encoding='utf-8'))
        for raw in parser.links:
            u=urlsplit(raw)
            if u.scheme or u.netloc or raw.startswith('#') or raw.startswith('mailto:'): continue
            rel=u.path
            if not rel: continue
            expect(not rel.startswith('/'),f'{page.relative_to(ROOT)}: root-relative link blocks portable offline/subpath use: {raw}')
            target=(page.parent/rel).resolve()
            try: target.relative_to(ROOT.resolve())
            except ValueError: fail(f'{page.relative_to(ROOT)}: link escapes repo: {raw}')
            if rel.endswith('/'): target=target/'index.html'
            expect(target.exists(),f'{page.relative_to(ROOT)}: broken local link {raw}')

def main():
    records=verify_records(); verify_local_links(); verify_manifest('MANIFEST.sha256','sha256'); verify_manifest('MANIFEST.sha512','sha512')
    print(f'verify: OK: {len(records)} records; exact refs closed; exports reproducible; local links portable; both manifests complete')
if __name__=='__main__': main()
