#!/usr/bin/env python3
"""Additional stdlib integrity checks; full JSON Schema validation is optional tooling."""
from __future__ import annotations
import hashlib,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
EXCLUDED_PARTS={'.git','__pycache__','.pytest_cache','node_modules'}
def included(path):
    return path.is_file() and not any(x in EXCLUDED_PARTS for x in path.relative_to(ROOT).parts) and path.suffix not in {'.pyc','.pyo'}
def require(value,message):
    if not value:raise ValueError(message)
def pairs(values):
    out={}
    for k,v in values:
        if k in out:raise ValueError('Duplicate JSON key: '+k)
        out[k]=v
    return out
def reject_constant(value):raise ValueError('Non-JSON numeric constant: '+value)
def loads(text):return json.loads(text,object_pairs_hook=pairs,parse_constant=reject_constant)
def read(path):return loads(path.read_text(encoding='utf-8'))
def exact(obj):return f"{obj['id']}@{obj['revision']}"
def wrapped(path,name):
    text=re.sub(r'^/\*.*?\*/\s*','',path.read_text(encoding='utf-8').strip(),flags=re.S)
    prefix='window.'+name+'='
    require(text.startswith(prefix) and text.endswith(';'),f'Invalid generated wrapper: {path.name}')
    return loads(text[len(prefix):-1])
def run():
    files=[p for p in ROOT.rglob('*.json') if included(p)]
    for p in files:read(p)
    records={exact(read(p)):read(p) for p in (ROOT/'archive/objects').glob('*.json')}
    baseline=read(ROOT/'snapshot/releases/0.3/INVENTORY.json')
    unchanged=0
    for item in baseline:
        if item['path'].startswith('archive/objects/'):
            p=ROOT/item['path'];require(p.is_file() and hashlib.sha256(p.read_bytes()).hexdigest()==item['sha256'],f'Original archive object changed: {item["path"]}');unchanged+=1
    idx=read(ROOT/'archive/index.json')
    for item in idx:
        obj=read(ROOT/'archive'/item['path']);canon=(json.dumps(obj,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n').encode()
        require(item['ref']==exact(obj),'Archive index identity differs')
        for alg in ['sha256','sha512']:require(item[alg]==hashlib.new(alg,canon).hexdigest(),'Archive canonical digest differs: '+item['ref'])
        for key in ['id','revision','kind','title','summary','domains']:require(item[key]==obj[key],'Archive index metadata drift: '+key)
        require(item['verification']==obj['verification']['level'],'Archive verification mirror drift')
    atlas=read(ROOT/'atlas/concepts.json');history=read(ROOT/'atlas/history.json')
    require(wrapped(ROOT/'assets/atlas-data.js','QEVA_ATLAS')==atlas,'Atlas wrapper drift')
    require(wrapped(ROOT/'assets/history-data.js','QEVA_HISTORY')==history['milestones'],'History wrapper drift')
    nodes={n['id'] for n in atlas['concepts']}
    for node in atlas['concepts']:
        require(node.get('qeva') in records,'Atlas node ref unresolved: '+node['id'])
    for edge in atlas['edges']:require(edge['source'] in nodes and edge['target'] in nodes,'Atlas edge endpoint missing')
    family={k:[read(p) for p in sorted((ROOT/'learning'/k).glob('*.json'))] for k in ['concepts','activities','routes']}
    concepts={exact(c):c for c in family['concepts']};activities={exact(a):a for a in family['activities']}
    require(len(concepts)==len(family['concepts']) and len(activities)==len(family['activities']),'Duplicate teaching revision')
    require(len({c['id'] for c in concepts.values()})==len(concepts),'Bundle has ambiguous active profile revisions; add explicit current-entry resolver before multi-revision delivery')
    for key,c in concepts.items():
        require(c['schema_version']=='qeva-learning-concept/1','Unsupported profile schema')
        require(c['concept_ref'] in records,'Unresolved source: '+key)
        formal=c['explanation']['formal'];require(formal['source_ref']==c['concept_ref'],'Formal source differs from profile target')
        require(formal['text']==records[c['concept_ref']]['content']['exact'],'Formal excerpt drift: '+key)
        for r in c['related']+c['provenance']['source_refs']:require(r in records,'Unresolved related/source ref: '+r)
        require(len({p['ref'] for p in c['prerequisites']})==len(c['prerequisites']),'Duplicate prerequisite')
        for prereq in c['prerequisites']:
            require(prereq['ref'] in concepts,'Missing prerequisite '+prereq['ref'])
            require(prereq['minimum_state'] in ['understood','mastered'] and bool(prereq['reason'].strip()),'Invalid prerequisite reason/threshold')
        require(len(set(c['activities']))==len(c['activities']),'Duplicate activity ref')
        for r in c['activities']:require(r in activities and activities[r]['concept_ref']==key,'Missing or wrongly owned activity '+r)
        for level in ['understood','mastered']:require(c['mastery'][level] and set(c['mastery'][level])<=set(c['activities']),'Empty/unowned mastery rubric')
        require(not set(c['mastery']['understood'])&set(c['mastery']['mastered']),'Transfer checks must differ from core checks')
        require(set(c['activities'])==set(c['mastery']['understood']+c['mastery']['mastered']),'Activity without rendered rubric placement')
        static=ROOT/'learn/concepts'/c['id'].split(':')[-1]/'index.html';require(static.is_file(),'Missing static reading edition')
    seen=set();visiting=set()
    def visit(ref):
        require(ref not in visiting,'Learning prerequisite cycle '+ref)
        if ref in seen:return
        visiting.add(ref)
        for p in concepts[ref]['prerequisites']:visit(p['ref'])
        visiting.remove(ref);seen.add(ref)
    for r in concepts:visit(r)
    types=set()
    for key,a in activities.items():
        require(a['schema_version']=='qeva-activity/1','Unsupported activity schema');types.add(a['type'])
        require(a['concept_ref'] in concepts and key in concepts[a['concept_ref']]['activities'],'Orphan activity')
        for source in a['source_refs']:require(source in records,'Unresolved activity source '+source)
        c=a['config'];t=a['type']
        def ids(items):
            values=[v['id'] for v in items];require(len(values)==len(set(values)),'Duplicate option/step ID: '+key);return set(values)
        if t=='number':require(type(c['value']) in [int,float] and type(c['tolerance']) in [int,float] and c['tolerance']>=0,'Invalid numeric answer')
        elif t=='choice':require(c['correct'] in ids(c['options']),'Invalid correct option')
        elif t=='classification':
            labels=ids(c['labels']);ids(c['items']);require(all(i['label'] in labels for i in c['items']),'Unresolved classification label')
        elif t=='order':require(set(c['correct'])==ids(c['steps']) and len(set(c['correct']))==len(c['correct']),'Order is not a permutation')
        elif t=='experiment':
            require(c['kernel_ref'] in ['qeva:kernel:affine@1','qeva:kernel:logistic@1','qeva:kernel:collatz@1'],'Unknown kernel')
            require(c['correct'] in ids(c['conclusions']),'Invalid experiment conclusion')
            require(set(c['editable'])<=set(c['parameters']),'Invalid editable parameter')
            require(c['vary'] is None or (c['vary'] in c['editable'] and c['minimum_runs']>=2),'Variation requirement inconsistent')
        else:raise ValueError('Unsupported type '+t)
    route_refs=set()
    for r in family['routes']:
        require(r['schema_version']=='qeva-learning-route/1' and r['goal_ref'] in concepts,'Invalid route goal')
        require(exact(r) not in route_refs,'Duplicate route revision');route_refs.add(exact(r))
    bundle=wrapped(ROOT/'assets/learning-data.js','QEVA_LEARNING');index=read(ROOT/'learning/index.json')
    for k,v in family.items():require(bundle[k]==v,'Learning bundle drift: '+k)
    expected=[]
    for k in family:
        for p in sorted((ROOT/'learning'/k).glob('*.json')):expected.append({'family':k,'ref':exact(read(p)),'path':p.relative_to(ROOT/'learning').as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
    expected.sort(key=lambda v:v['ref']);require(index['entries']==expected,'Learning index drift')
    require(bundle['source_digest']==hashlib.sha256(json.dumps(expected,sort_keys=True,separators=(',',':')).encode()).hexdigest(),'Learning source digest drift')
    contract=read(ROOT/'services/contracts.json');require(contract['status']=='design-contract-not-implemented' and not any(contract['capabilities'].values()),'Offline release misrepresents services')
    return {'json_files':len(files),'unchanged_archive_objects':unchanged,'learning_profiles':len(concepts),'activities':len(activities),'types':len(types),'routes':len(route_refs)}
if __name__=='__main__':print(run())
