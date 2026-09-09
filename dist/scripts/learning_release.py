#!/usr/bin/env python3
"""Deterministic learning exports and static reading views. Python stdlib only."""
from __future__ import annotations
import hashlib
import html
import json
import re
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]

def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding='utf-8', newline='\n')

def dump(path: Path, obj: object) -> None:
    write(path, json.dumps(obj, ensure_ascii=False, indent=2) + '\n')

def esc(text: object) -> str:
    return html.escape(str(text), quote=True)

def exact(obj: dict) -> str:
    return f"{obj['id']}@{obj['revision']}"

def archive_href(ref: str, prefix: str) -> str:
    slug, rev = ref.rsplit(':', 1)[-1].split('@')
    return f'{prefix}archive/index.html#{slug}-r{rev}'

def page(title: str, body: str, prefix: str = '../', active: str = '', scripts: tuple[str, ...] = ()) -> str:
    links = [('Learn','learn'),('Map','map'),('Sandbox','sandbox'),('History','history'),('Archive','archive'),('Protocol','protocol')]
    nav = ''.join(f'<a href="{prefix}{path}/index.html"'+(' aria-current="page"' if active == path else '')+f'>{name}</a>' for name,path in links)
    js = ''.join(f'<script src="{prefix}assets/{name}.js"></script>' for name in scripts)
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta name="description" content="{esc(title)} — explore, experiment, and inspect exact knowledge with QEVA."><title>{esc(title)} — QEVA</title><link rel="icon" href="{prefix}assets/q.svg" type="image/svg+xml"><link rel="stylesheet" href="{prefix}assets/site.css"><link rel="stylesheet" href="{prefix}assets/learning.css"></head>
<body data-root="{prefix}"><a class="skip-link" href="#main">Skip to content</a>
<header class="shell masthead"><a class="brand" href="{prefix}index.html" aria-label="QEVA home"><img src="{prefix}assets/q.svg" width="30" height="30" alt=""><span>QEVA</span></a><nav aria-label="Primary">{nav}</nav></header>
<main id="main" class="shell page">{body}</main>
<footer class="shell footer"><span>QEVA · knowledge through discovery</span><span><a href="{prefix}notebook/index.html">Local notebook</a> · <a href="{prefix}community/index.html">Accounts & teams</a> · <a href="{prefix}preservation/index.html">Preservation</a></span></footer>{js}</body></html>\n'''

CORE = ('kernels','learning-engine','learning-data','local-state','learning-ui')

def activity_static(a: dict) -> str:
    c = a['config']; typ = a['type']; content = ''
    if typ == 'number':
        content = ('<p class="formula">'+' → '.join(map(esc,c['display']))+'</p>') if c['display'] else ''
        answer = str(c['value'])
    elif typ == 'choice':
        content = '<ol>'+''.join('<li>'+esc(x['text'])+'</li>' for x in c['options'])+'</ol>'
        answer = next(x['text'] for x in c['options'] if x['id'] == c['correct'])
    elif typ == 'classification':
        content = '<ol>'+''.join('<li>'+esc(x['text'])+'</li>' for x in c['items'])+'</ol>'
        labels = {x['id']:x['text'] for x in c['labels']}
        answer = '\n'.join(x['text']+' → '+labels[x['label']] for x in c['items'])
    elif typ == 'order':
        content = '<ol>'+''.join('<li>'+esc(x['text'])+'</li>' for x in c['steps'])+'</ol>'
        steps = {x['id']:x['text'] for x in c['steps']}
        answer = '\n'.join(str(i+1)+'. '+steps[k] for i,k in enumerate(c['correct']))
    else:
        content = '<p>Kernel: <code>'+esc(c['kernel_ref'])+'</code>. Reproduce with the declared parameters:</p><pre>'+esc(json.dumps(c['parameters'],indent=2))+'</pre>'
        answer = next(x['text'] for x in c['conclusions'] if x['id'] == c['correct'])
    return f'''<article class="static-activity" id="{esc(a['id'].split(':')[-1])}"><p class="eyebrow">{esc(a['stage'])} · {esc(a['type'])}</p><h3>{esc(a['title'])}</h3><p>{esc(a['prompt'])}</p>{content}<details><summary>Hint</summary><p>{esc(a['hint'])}</p></details><details><summary>Answer and its scope</summary><pre>{esc(answer)}</pre><p>{esc(a['feedback']['pass'])}</p></details><p class="meta">Exact activity revision: {esc(exact(a))}</p></article>'''

def learning_data() -> dict:
    bundle = {'schema_version':'qeva-learning-bundle/1','release':'0.4.0','concepts':[],'activities':[],'routes':[]}
    index = {'schema_version':'qeva-learning-index/1','release':'0.4.0','entries':[]}
    for family in ('concepts','activities','routes'):
        for source in sorted((ROOT/'learning'/family).glob('*.json')):
            value = json.loads(source.read_text(encoding='utf-8')); bundle[family].append(value)
            index['entries'].append({'family':family,'ref':exact(value),'path':source.relative_to(ROOT/'learning').as_posix(),'sha256':hashlib.sha256(source.read_bytes()).hexdigest()})
    index['entries'].sort(key=lambda x:x['ref'])
    bundle['source_digest'] = hashlib.sha256(json.dumps(index['entries'],sort_keys=True,separators=(',',':')).encode()).hexdigest()
    dump(ROOT/'learning/index.json',index)
    encoded = json.dumps(bundle,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c').replace('\u2028','\\u2028').replace('\u2029','\\u2029')
    write(ROOT/'assets/learning-data.js','/* Generated by scripts/release.py; edit learning/ sources, not this wrapper. */\nwindow.QEVA_LEARNING='+encoded+';\n')
    return bundle

def generate_learning(bundle: dict) -> None:
    profiles={exact(c):c for c in bundle['concepts']}; activities={exact(a):a for a in bundle['activities']}
    cards=[]
    for route in reversed(bundle['routes']):
        goal=profiles[route['goal_ref']]['id'].split(':')[-1]
        cards.append(f'<a class="route-card" href="index.html?goal={goal}"><p class="eyebrow">LEARNING EXPEDITION</p><h3>{esc(route["title"])}</h3><p>{esc(route["description"])}</p><span class="text-link">Trace the route →</span></a>')
    listing=''.join(f'<li><a href="concepts/{c["id"].split(":")[-1]}/index.html">{esc(c["title"])}</a></li>' for c in bundle['concepts'])
    body=f'''<header class="page-header compact"><p class="eyebrow">LEARN · FOLLOW A CONNECTION</p><h1>Begin with a move.</h1><p>Predict, change a rule, inspect what survives. The route follows what you have demonstrated—not a fixed series of missions. Formal knowledge is always open.</p></header>
<p class="local-note" data-storage-notice>With JavaScript, progress stays in this browser. Without it, every reading edition below remains available.</p><p data-learning-error role="status"></p>
<div id="learning-app" hidden><div class="learning-tools"><div class="goal-control"><label for="learning-goal">I want to work toward…</label><select id="learning-goal"></select></div><label class="formal-toggle"><input id="formal-mode" type="checkbox"> Expose formal layers immediately</label></div>
<div class="learning-layout"><aside class="route-sidebar" aria-label="Learning prerequisites"><h2>Your route through the graph</h2><ol id="route-path" class="route-path"></ol><p id="route-status" class="meta" role="status"></p><p class="meta">Locked means “missing guided prerequisites,” not “forbidden to read.”</p><a class="inline-link" href="../notebook/index.html">Inspect / export your notebook</a></aside><div><article id="concept-content"></article><div id="next-connection" class="next-connection"></div></div></div></div>
<section class="static-catalog"><h2>Choose another expedition</h2><div class="route-grid">{''.join(cards)}</div><details><summary>All {len(profiles)} static reading editions</summary><p>Plain explanations, exact pinned statements, exercises, answers, proof scope and dependencies. No JavaScript or account required.</p><ul>{listing}</ul></details><noscript><p class="notice">Interactive controls require JavaScript; the static editions above contain the entire authored learning content and exercise answers.</p></noscript></section>'''
    write(ROOT/'learn/index.html',page('Learn',body,active='learn',scripts=CORE+('activities','learn')))
    for c in bundle['concepts']:
        e=c['explanation']; slug=c['id'].split(':')[-1]; prefix='../../../'
        parts=[f'<header class="page-header compact"><p class="eyebrow">STATIC LEARNING EDITION · {esc(c["difficulty"])}</p><h1>{esc(c["title"])}</h1><p>{esc(e["intuition"])}</p><p><a class="button" href="../../index.html?goal={slug}">Open interactive route</a> <a class="button secondary" href="{archive_href(c["concept_ref"],prefix)}">Exact archive record</a></p></header><article class="static-lesson">']
        for key in ('manipulation','pattern','mechanism'):
            parts.append(f'<section><h2>{key.capitalize()}</h2><p>{esc(e[key])}</p></section>')
        for field,label,name in [('vocabulary','Vocabulary','term'),('notation','Notation','symbol')]:
            parts.append('<section><h2>'+label+'</h2><dl class="term-list">'+''.join('<dt>'+esc(x[name])+'</dt><dd>'+esc(x['meaning'])+'</dd>' for x in e[field])+'</dl></section>')
        f=e['formal']; proof=e['proof']
        parts.append(f'<section><h2>Formal statement</h2><p>Context: {esc(f["context"])}</p><p class="formal-statement">{esc(f["text"])}</p><p>Copied from <a href="{archive_href(f["source_ref"],prefix)}">{esc(f["source_ref"])}</a>; that record’s bytes and verification label are unchanged.</p>')
        if f['caveat']:parts.append('<p class="caution">'+esc(f['caveat'])+'</p>')
        parts.append('</section><section><h2>Proof scope · '+esc(proof['label'])+'</h2><p>'+esc(proof['statement'])+'</p><ol>'+''.join('<li>'+esc(s)+'</li>' for s in proof['steps'])+'</ol><p class="caution">'+esc(proof['limitation'])+'</p></section>')
        parts.append('<section><h2>Predict, experiment, verify, transfer</h2><p>Answers are available for self-study. An answer in this edition does not grant a credential or change archive verification.</p>'+''.join(activity_static(activities[a]) for a in c['activities'])+'</section>')
        parts.append('<section><h2>Learning dependencies</h2><p>Editorial guidance, not proof dependencies. All exact mathematical dependencies remain in the archive.</p><ul>'+''.join(f'<li><a href="../{profiles[p["ref"]]["id"].split(":")[-1]}/index.html">{esc(profiles[p["ref"]]["title"])}</a> — {esc(p["reason"])} Minimum local state: {p["minimum_state"]}.</li>' for p in c['prerequisites'])+'</ul></section>')
        parts.append('<section><h2>Frontier</h2><p>'+esc(e['frontier'])+'</p><p>'+' · '.join(f'<a href="{archive_href(r,prefix)}">{esc(r)}</a>' for r in c['related'])+'</p></section>')
        parts.append(f'<p class="notice">Learning profile {esc(exact(c))}. This is an editorial overlay awaiting mathematical review; it does not upgrade source verification. <a href="{prefix}learning/concepts/{slug}.r{c["revision"]}.json">Raw learning profile</a>.</p></article>')
        write(ROOT/f'learn/concepts/{slug}/index.html',page(c['title']+' — reading edition',''.join(parts),prefix,active='learn'))

RULES='''<div class="rule-grid"><article><h3>01 · DECLARE</h3><p>State the rule, domain, initial values, arithmetic and stopping limits.</p></article><article><h3>02 · REPRODUCE</h3><p>Keep the exact interpreter revision and parameters, not only the picture.</p></article><article><h3>03 · LABEL</h3><p>Separate an observation, conjecture, claimed proof and verified result.</p></article><article><h3>04 · PRESERVE FAILURE</h3><p>Keep failed predictions and unfinished runs. A time limit is not a counterexample.</p></article></div>'''

def generate_workshop() -> None:
    body='''<header class="page-header compact"><p class="eyebrow">SANDBOX · PERSONAL LABORATORY</p><h1>Declare a world.<br>Test what follows.</h1><p>A sandbox can reveal behavior. It cannot silently upgrade behavior into truth. Create a portable experiment without an account.</p></header>'''+RULES+'''
<p class="local-note">Local drafts are optional browser storage. JSON is the portable copy; accounts, cloud publication and live collaboration are not connected.</p>
<div id="workshop" hidden><p id="lab-status" class="lab-status" role="status" aria-live="polite"></p><p id="lab-save-state" class="meta">New unsaved laboratory · nothing has been uploaded.</p>
<div class="lab-layout"><section class="lab-declaration" aria-labelledby="declare-title"><h2 id="declare-title">Declare the experiment</h2><div class="field"><label for="lab-title">Laboratory title</label><input id="lab-title" maxlength="160"></div><div class="field"><label for="lab-kernel">Versioned mathematical tool</label><select id="lab-kernel"></select></div><p id="lab-rule" class="formula"></p><p id="lab-domain" class="meta"></p><div id="lab-parameters"></div><div class="field"><label for="lab-label">Your claim label</label><select id="lab-label"></select></div><p id="lab-claim-status" class="caution"></p><div class="field"><label for="lab-claim">Prediction, observation or claim — include its scope</label><textarea id="lab-claim" rows="4" maxlength="4000" placeholder="I predict… Under these parameters… This would not establish…"></textarea></div><div class="field"><label for="lab-creator">Creator label (self-described, not authenticated)</label><input id="lab-creator" maxlength="160"></div><div class="field"><label for="run-note">Note to preserve with the next run</label><textarea id="run-note" rows="3" maxlength="2000" placeholder="What changed? What failed? What should another person check?"></textarea></div><button id="lab-run" class="button" type="button">Run & retain the result →</button><p id="lab-identity" class="lab-identity"></p><div id="lab-concept-links" class="lab-concept-links"></div></section>
<section aria-labelledby="observe-title"><h2 id="observe-title">Observe without overclaiming</h2><p id="lab-readout" class="readout"></p><div id="lab-chart"></div><h3 class="section-label">Preserved run journal</h3><div id="lab-journal"></div></section></div>
<section class="plain-section lab-actions"><h2>Keep it, share it, or make a branch.</h2><div class="lab-toolbar"><button id="lab-save" class="button" type="button">Save locally</button><button id="lab-export" class="button secondary" type="button">Export full JSON</button><button id="lab-share" class="button secondary" type="button">Create specification link</button><button id="lab-fork" class="button secondary" type="button">Fork / remix</button><button id="lab-new" class="small-button" type="button">New journal</button></div><p class="meta">A link carries the specification and claim text, not the run journal. Export JSON to preserve all runs. A shared link is not secret and does not publish anything to a QEVA server.</p><label class="file-control" for="lab-import">Import a portable sandbox (JSON, up to 2 MiB)<input id="lab-import" type="file" accept=".json,application/json"></label><label class="sr-only" for="lab-share-value">Prepared specification link or offline fragment</label><textarea id="lab-share-value" class="share-value" readonly hidden></textarea><button id="copy-share" class="small-button" type="button" hidden>Copy share text</button></section>
<section class="plain-section"><h2>Laboratories on this browser</h2><p id="lab-draft-status" class="meta" role="status"></p><ul id="lab-drafts" class="lab-drafts"></ul><p class="meta">Browser storage is replaceable and can be cleared. Export important work. Unsaved runs remain only in the current tab.</p></section></div>
<section class="static-catalog"><h2>Portable even without this interface</h2><p>The available interpreters are affine recurrence, paired logistic recurrence, and exact-integer Collatz recurrence. Each has a bounded parameter set. Arbitrary user code is intentionally unsupported.</p><p><a href="../examples/affine.json">Affine specimen</a> · <a href="../examples/logistic.json">Logistic specimen</a> · <a href="../examples/collatz.json">Collatz specimen</a> · <a href="../../protocol/SANDBOX_CORE.txt">Human-readable format</a> · <a href="../../protocol/sandbox.schema.json">JSON Schema</a></p><noscript><p class="notice">JavaScript is needed to run and edit experiments here. The JSON specimens, mathematical rules, format specification and all archive records remain independently readable. No account is required.</p></noscript><p><a href="../index.html">Return to the original demonstration instruments →</a></p></section>'''
    write(ROOT/'sandbox/workshop/index.html',page('Personal laboratory',body,'../../','sandbox',CORE+('sandbox-model','workshop')))


def generate_notebook() -> None:
    body='''<header class="page-header compact"><p class="eyebrow">LOCAL NOTEBOOK · NOT AN ACCOUNT</p><h1>The route you<br>have uncovered.</h1><p>This notebook records activity evidence on this browser. It is not a login, a credential, or a verification authority. Your knowledge record can travel as JSON.</p></header><p class="local-note" data-storage-notice></p>
<div id="notebook" hidden><p id="notebook-summary" class="meta"></p><div class="table-scroll" tabindex="0" role="region" aria-label="Local learning states"><table class="data-table"><thead><tr><th scope="col">Concept</th><th scope="col">Local state</th><th scope="col">Understanding checks</th><th scope="col">Transfer checks</th></tr></thead><tbody id="progress-rows"></tbody></table></div><p class="meta">Locked → available → discovered → learning → understood → mastered. These are activity-rubric states, not judgments about a person’s full mathematical ability.</p>
<div class="notebook-actions"><button id="progress-export" class="button" type="button">Export notebook JSON</button><button id="progress-raw" class="small-button" type="button">Export original stored bytes</button><button id="progress-reset" class="small-button" type="button">Reset local learning</button></div><label class="file-control" for="progress-import">Merge an exported notebook (JSON, up to 1 MiB)<input id="progress-import" type="file" accept=".json,application/json"></label><p id="notebook-status" class="lab-status" role="status" aria-live="polite"></p><p class="caution">Imports are untrusted self-reports. Known responses are rechecked against exact activity revisions. Unknown revisions are retained but do not grant mastery. No uploaded file can change the archive.</p><section class="plain-section"><h2>Attempt history, including failures</h2><div id="attempt-history" class="attempt-history"></div></section></div>
<noscript><p class="notice">This local evidence viewer needs JavaScript. Static learning editions and formal archive records do not.</p></noscript><section class="plain-section"><h2>Independent of membership</h2><p>Future accounts may synchronize learning evidence and saved work. They cannot become prerequisites for reading, calculating, exporting, or preserving QEVA-native knowledge.</p><p><a href="../learn/index.html">Return to Learn</a> · <a href="../sandbox/workshop/index.html">Open saved laboratories</a> · <a href="../community/index.html">Account and team boundary</a> · <a href="../protocol/LEARNING_CORE.txt">Learner format and semantics</a></p></section>'''
    write(ROOT/'notebook/index.html',page('Local notebook',body,active='learn',scripts=CORE+('notebook',)))

def generate_community() -> None:
    body='''<header class="page-header compact"><p class="eyebrow">COMMUNITY · A DEFINED BOUNDARY</p><span class="service-status">ACCOUNT / TEAM SERVICE: NOT CONNECTED</span><h1>Work together.<br>Keep truth separate.</h1><p>QEVA can grow a community without making the archive depend on one. This release has no login, team membership, public publishing service, or live collaboration.</p></header>
<div class="boundary-grid"><article><p class="eyebrow">DURABLE KNOWLEDGE</p><h2>The part that must survive.</h2><p>Exact archive revisions, source provenance, verification artifacts, protocol, static learning releases, open sandbox specifications and fixity manifests.</p><p>Readable and copyable without an account, database, API key or institutional permission.</p></article><article><p class="eyebrow">REPLACEABLE SERVICE STATE</p><h2>The part a service may operate.</h2><p>Accounts, sessions, progress sync, team roles, discussions, moderation, notifications, draft sharing and review queues.</p><p>Replaceable infrastructure. A member role or popularity count grants no mathematical status.</p></article></div>
<section class="plain-section"><h2>Already possible, without a backend.</h2><p>Learn locally, inspect your progress, build bounded mathematical experiments, preserve failures, export complete notebooks, exchange specification links or JSON files, and fork a received laboratory.</p><div class="hero-actions"><a class="button" href="../notebook/index.html">Open your local notebook</a><a class="button secondary" href="../sandbox/workshop/index.html">Create a portable laboratory</a></div></section>
<section class="plain-section"><h2>Future accounts and teams.</h2><p>The versioned service contract reserves progress, saved concepts, drafts, published sandboxes, collections, contributions and reviews. Teams add members, roles, shared laboratories, shared concept maps, challenge sets, expeditions, review queues, discussions and contribution history.</p><p>Implementation requires a real identity service, durable service database, server-side authorization, privacy controls, moderation, backups, export/deletion paths and an authenticated audit trail. None is simulated by browser storage or a “Sign in” button.</p><p><a href="../services/contracts.json">Read the machine-readable service contract</a> · <a href="../docs/COMMUNITY_BOUNDARY.md">Implementation boundary and next steps</a></p></section>
<section class="plain-section"><h2>Contribution is a lifecycle, not a vote.</h2><div class="lifecycle">personal sandbox → shared sandbox → team experiment
→ community review → candidate knowledge object
→ explicit verification → QEVA release → permanent archive</div><p class="caution">Sharing does not publish into the canonical archive. Team approval is not proof. A popular community object never automatically becomes permanent knowledge.</p><p>Only an explicit, separately authorized release process can admit an exact record revision, preserving assumptions, review evidence, provenance and any objections.</p></section>'''
    write(ROOT/'community/index.html',page('Accounts and teams',body,scripts=('services',)))


def common_shell(path: Path) -> None:
    text = path.read_text(encoding='utf-8')
    if 'masthead' not in text: return
    prefix='../'*(len(path.relative_to(ROOT).parts)-1)
    if 'assets/learning.css' not in text:
        text=text.replace('</head>',f'<link rel="stylesheet" href="{prefix}assets/learning.css"></head>')
    if '<body>' in text:text=text.replace('<body>',f'<body data-root="{prefix}">',1)
    if 'class="skip-link"' not in text:
        text=re.sub(r'(<body[^>]*>)',r'\1<a class="skip-link" href="#main">Skip to content</a>',text,count=1)
        text=re.sub(r'<main(?![^>]*\bid=)', '<main id="main"',text,count=1)
    if not re.search(r'<nav[^>]*>\s*<a[^>]*href="[^"]*learn/',text):
        # Existing page headers, not already generated Learn-first headers.
        text=re.sub(r'(<nav(?:\s[^>]*)?>)',r'\1'+f'<a href="{prefix}learn/index.html">Learn</a>',text,count=1)
    if '<nav>' in text:text=text.replace('<nav>','<nav aria-label="Primary">',1)
    if 'notebook/index.html' not in text:
        text=text.replace('</footer>',f'<span><a href="{prefix}notebook/index.html">Local notebook</a> · <a href="{prefix}community/index.html">Accounts & teams</a></span></footer>')
    def portable(match):
        raw=match.group(1); parts=urlsplit(raw)
        if parts.scheme or parts.netloc or not parts.path.endswith('/'):return match.group(0)
        rewritten=parts.path+'index.html'+('?' + parts.query if parts.query else '')+('#'+parts.fragment if parts.fragment else '')
        return 'href="'+rewritten+'"'
    text=re.sub(r'href="([^"]+)"',portable,text)
    write(path,text)


def generate_map_fallback() -> None:
    p=ROOT/'map/index.html';text=p.read_text(encoding='utf-8')
    records=[json.loads(f.read_text()) for f in (ROOT/'archive/objects').glob('*.json')]
    records.sort(key=lambda x:x['title'].casefold())
    listing='<ul class="concept-index">'+''.join(f'<li><a href="{archive_href(exact(o),"../")}">{esc(o["title"])}</a><br><span class="meta">{esc(o["summary"])}</span></li>' for o in records)+'</ul>'
    section=f'<section class="fallback-list" aria-labelledby="all-concepts"><h2 id="all-concepts">All {len(records)} archive concepts — readable without JavaScript</h2>{listing}</section>'
    text=re.sub(r'<section class="fallback-list".*?</section>',section,text,flags=re.S)
    write(p,text)


def build() -> dict:
    bundle=learning_data();generate_learning(bundle);generate_workshop();generate_notebook();generate_community();generate_map_fallback()
    # Existing Atlas JSON is authoritative; wrappers must never drift from it.
    atlas=json.loads((ROOT/'atlas/concepts.json').read_text(encoding='utf-8'))
    history=json.loads((ROOT/'atlas/history.json').read_text(encoding='utf-8'))
    write(ROOT/'assets/atlas-data.js','window.QEVA_ATLAS='+json.dumps(atlas,ensure_ascii=False,separators=(',',':'))+';\n')
    write(ROOT/'assets/history-data.js','window.QEVA_HISTORY='+json.dumps(history['milestones'],ensure_ascii=False,separators=(',',':'))+';\n')
    return bundle
