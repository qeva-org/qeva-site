#!/usr/bin/env python3
"""Optional DOM acceptance tests. --embedded substitutes origin/storage for restricted runners."""
from __future__ import annotations
import argparse,json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_support import Harness,ROOT
parser=argparse.ArgumentParser();parser.add_argument('--base',default='http://localhost:8000/');parser.add_argument('--embedded',action='store_true');parser.add_argument('--browser',default='/usr/bin/chromium');parser.add_argument('--output',default=str(ROOT.parent/'qeva-browser-results'));args=parser.parse_args()
OUT=Path(args.output);OUT.mkdir(parents=True,exist_ok=True)
checks=[]
def check(condition,name):
    if not condition:raise AssertionError(name)
    checks.append(name)
def capture(page,name):page.screenshot(path=str(OUT/(name+'.png')),full_page=True)
def good(a):
    c=a['config'];t=a['type']
    if t=='number':return {'value':str(c['value'])}
    if t=='choice':return {'option':c['correct']}
    if t=='classification':return {'labels':{i['id']:i['label'] for i in c['items']}}
    if t=='order':return {'order':c['correct']}
    runs=[dict(c['parameters']) for _ in range(c['minimum_runs'])]
    if c['vary']:
        k=c['vary'];v=runs[1][k];runs[1][k]=0 if v!=0 else .5
    return {'runs':runs,'conclusion':c['correct']}
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=args.browser,args=['--no-sandbox'])
    h=Harness(browser,args.base,args.embedded)
    page=h.load('index.html');capture(page,'home-desktop')
    check(page.locator('#arrival-activity').is_visible(),'homepage immediate activity visible')
    page.locator('#arrival-activity input[type=number]').fill('17');page.locator('#arrival-activity button[type=submit]').click()
    check(page.locator('#arrival-activity').get_attribute('data-passed')=='false','wrong first prediction retained as failure')
    page.locator('#arrival-activity input[type=number]').fill('16');page.locator('#arrival-activity button[type=submit]').click()
    check(page.locator('#arrival-next').is_visible(),'correct prediction reveals real route link')
    check(page.evaluate('QEVA.Local.get().attempts.length')==2,'homepage retains failed and successful attempts')
    page=h.load('learn/index.html?goal=chaos')
    check(page.locator('.concept-heading h2').inner_text()=='Recurrence relation','route resumes at missing recurrence after first prediction')
    page.locator('#formal-mode').check();check(page.locator('[data-formal]').get_attribute('open') is not None,'expert formal disclosure opens immediately')
    # Render and submit every published activity through real DOM controls, all five types.
    activities={a['id']+'@'+str(a['revision']):a for a in (json.loads(f.read_text()) for f in (ROOT/'learning/activities').glob('*.json'))}
    for f in sorted((ROOT/'learning/concepts').glob('*.json')):
        c=json.loads(f.read_text());slug=c['id'].split(':')[-1]
        page=h.load('learn/index.html?goal='+slug+'&concept='+slug)
        for ref in c['activities']:
            a=activities[ref];conf=a['config'];root=page.locator('[data-activity-ref="'+ref+'"]');answer=good(a)
            root.locator('button[type=submit]').click()
            check(root.get_attribute('data-passed')=='false','blank response fails in renderer '+ref)
            prefix='activity-'+a['id'].split(':')[-1]
            if a['type']=='number':root.locator('input[type=number]').fill(answer['value'])
            elif a['type']=='choice':root.locator('input[type=radio][value="'+answer['option']+'"]').check()
            elif a['type']=='classification':
                for key,value in answer['labels'].items():root.locator('#'+prefix+'-'+key).select_option(value)
            elif a['type']=='order':
                for target,step in enumerate(answer['order']):
                    for _ in range(len(answer['order'])):
                        ids=root.locator('.proof-steps [data-dir="-1"]').evaluate_all('(els)=>els.map(e=>e.dataset.step)')
                        if ids.index(step)==target:break
                        root.locator('[data-step="'+step+'"][data-dir="-1"]').click()
                    check(ids.index(step)==target,'keyboard-compatible ordering step '+step)
            else:
                for params in answer['runs']:
                    for key,value in params.items():
                        input=root.locator('#'+prefix+'-'+key)
                        if input.is_enabled():input.fill(str(value))
                    root.get_by_role('button',name='Run the declared rule',exact=True).click()
                check(root.locator('svg.trajectory').count()==1,'experiment plot exists '+ref)
                check(root.locator('.run-comparisons li').count()==len(answer['runs']),'comparison runs retained '+ref)
                root.locator('input[type=radio][value="'+answer['conclusion']+'"]').check()
            root.locator('button[type=submit]').click()
            check(root.get_attribute('data-passed')=='true','valid response passes rendered '+ref)
    check(page.evaluate("Array.from(QEVA.catalog.progress(QEVA.Local.get()).states.values()).every(s=>s==='mastered')"),'all eleven profile rubrics complete through DOM controls')
    page=h.load('notebook/index.html');check(page.locator('#progress-rows tr').count()==11,'notebook lists all eleven progress states')
    check(page.locator('#attempt-history details').count()>=50,'notebook keeps failed and successful response history')
    page.evaluate("window.__exported=null;QEVA.UI.download=(text,name)=>{window.__exported={text,name};}")
    page.locator('#progress-export').click();exported=page.evaluate('window.__exported');check(json.loads(exported['text'])['schema_version']=='qeva-learner/1','notebook export serialized schema')
    count=page.evaluate('QEVA.Local.get().attempts.length');page.locator('#progress-import').set_input_files({'name':'progress.json','mimeType':'application/json','buffer':exported['text'].encode()});page.wait_for_function('document.getElementById("notebook-status").textContent.length>0');check(page.evaluate('QEVA.Local.get().attempts.length')==count,'notebook import deduplicates same exported attempts')
    page=h.load('map/index.html?layer=learning&focus=chaos');check(page.locator('.map-node').count()==11,'learning Map renders eleven nodes')
    check(page.locator('.map-node[data-state=mastered]').count()==11,'Map reflects local rubric progress')
    page.locator('#map-q').fill('no-such-concept');check(page.locator('.map-node[tabindex="0"]').count()==0,'filtered nodes leave keyboard tab order');page.locator('#map-q').fill('')
    page.locator('.map-node[data-id=sequence]').focus();page.keyboard.press('Enter');check(page.locator('#map-detail h2').inner_text()=='Sequence','Map node selectable with Enter')
    page.locator('#map-layer').select_option('atlas');check(page.locator('.map-node').count()==25,'editorial Atlas remains distinct and complete')
    page=h.load('archive/index.html?q=not-found#fixed-point-r1');check(page.locator('#fixed-point-r1 details').get_attribute('open') is not None,'exact archive anchor opens definition')
    check('hidden' not in (page.locator('#fixed-point-r1').get_attribute('class') or ''),'exact archive anchor survives incompatible search filter')
    # Portable laboratory, full JSON serialization/import, compact sharing and mixed-kernel failure journal.
    page=h.load('sandbox/workshop/index.html?kernel=collatz');page.locator('#workshop-start').fill('27');page.locator('#workshop-steps').fill('2');page.locator('#run-note').fill('The budget was insufficient. Preserve this failed reach-one search.');page.locator('#lab-run').click()
    check('Inconclusive' in page.locator('#lab-readout').inner_text(),'laboratory budget stop is inconclusive')
    page.locator('#lab-save').click();check('Saved locally' in page.locator('#lab-status').inner_text(),'local laboratory save succeeds in harness')
    page.locator('#lab-kernel').select_option('qeva:kernel:logistic@1');page.locator('#lab-run').click();check(page.locator('#lab-journal .journal-entry').count()==2,'switching kernels preserves failed run')
    page.locator('#lab-label').select_option('proof');check('unreviewed' in page.locator('#lab-claim-status').inner_text(),'proof declaration remains unreviewed')
    page.evaluate("window.__exported=null;QEVA.UI.download=(text,name)=>{window.__exported={text,name};}");page.locator('#lab-export').click();exported=page.evaluate('window.__exported');doc=json.loads(exported['text']);check(len(doc['runs'])==2 and doc['runs'][0]['result']['status']=='step-budget','full export contains mixed-kernel failure journal')
    page.locator('#lab-share').click();link=page.locator('#lab-share-value').input_value();check('#lab=' in link and 'NOT the run journal' in page.locator('#lab-status').inner_text(),'specification link explicitly excludes run journal')
    capture(page,'laboratory-desktop')
    import_payload={'name':'laboratory.json','mimeType':'application/json','buffer':exported['text'].encode()};page.locator('#lab-import').set_input_files(import_payload);page.wait_for_function("document.getElementById('lab-status').textContent.includes('Imported as a remix')")
    check(page.locator('#lab-journal .journal-entry').count()==2,'full JSON import reruns and retains both runs')
    check('fork of' in page.locator('#lab-identity').inner_text(),'import creates explicit parent lineage')
    bad=json.loads(exported['text']);bad['runs'][0]['result']['series'][0][1]='9000';page.locator('#lab-import').set_input_files({'name':'tampered.json','mimeType':'application/json','buffer':json.dumps(bad).encode()});page.wait_for_function("document.getElementById('lab-status').textContent.includes('Import rejected')");check(page.locator('#lab-journal .journal-entry').count()==2,'tampered import leaves existing journal intact')
    page=h.load('sandbox/workshop/index.html#'+link.split('#',1)[1]);check(page.locator('#lab-journal .journal-entry').count()==0,'shared specification opens without pretending to carry journal');check('fork of' in page.locator('#lab-identity').inner_text(),'shared specification forks instead of overwriting')
    page=h.load('sandbox/index.html')
    pixel=page.locator('#coarse-canvas').evaluate("c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let dark=0;for(let i=0;i<a.length;i+=4)if(a[i+3]&&a[i]<100)dark++;return dark;}")
    check(pixel>100,'coarse-graining demonstration draws nonempty signal after repair')
    page=h.load('community/index.html');check(page.locator('form').count()==0,'community page contains no fake authentication form');check('NOT CONNECTED' in page.locator('.service-status').inner_text(),'unavailable community status explicit');check(page.evaluate('QEVA.Service.getSession()') is None,'null adapter has no fabricated session')
    page=h.load('learn/index.html?goal=unknown');check('Requested profile not present' in page.locator('#route-status').inner_text(),'unknown goal degrades visibly to supported route')
    page=h.load('sandbox/workshop/index.html#lab=invalid%21');check('Share fragment rejected' in page.locator('#lab-status').inner_text(),'malformed link rejected with usable fallback')
    check(not h.errors,'no JavaScript page errors in rendered flow')
    h.close()
    # Responsive checks with fresh local state.
    for width in [375,768,1440]:
        m=Harness(browser,args.base,args.embedded,width=width,height=900)
        for label,url in [('home','index.html'),('learn','learn/index.html'),('lab','sandbox/workshop/index.html'),('map','map/index.html?layer=learning'),('community','community/index.html')]:
            page=m.load(url);check(page.evaluate('document.documentElement.scrollWidth')<=width,'no horizontal document overflow '+label+' '+str(width))
            if width==375:capture(page,label+'-mobile')
            ids=page.locator('[id]').evaluate_all('(els)=>els.map(e=>e.id)');check(len(ids)==len(set(ids)),'no duplicate rendered IDs '+label+' '+str(width))
        check(not m.errors,'no responsive page errors '+str(width));m.close()
    # Static rendering remains meaningful; no application script runs.
    s=Harness(browser,args.base,args.embedded,width=375,height=900)
    if args.embedded:
        page=s.load('index.html',scripts=False);check('double' in page.locator('body').inner_text(),'no-JS homepage preserves declared prediction')
        for f in sorted((ROOT/'learning/concepts').glob('*.json')):
            c=json.loads(f.read_text());slug=c['id'].split(':')[-1];page=s.load('learn/concepts/'+slug+'/index.html',scripts=False)
            check(page.locator('.static-activity').count()==len(c['activities']),'static activities complete '+slug)
            check(c['explanation']['formal']['text'] in page.locator('body').inner_text(),'static formal excerpt readable '+slug)
    s.close()
    # Embedded failure injection tests; no claim about native browser quota behavior.
    if args.embedded:
        for mode in ['read','write']:
            f=Harness(browser,args.base,True);f.block=mode;page=f.load('learn/index.html');page.locator('input[type=number]').first.fill('16');page.locator('button[type=submit]').first.click();check(page.evaluate('QEVA.Local.get().attempts.length')==1,'memory learning usable with injected storage '+mode+' failure');check('only in this tab' in page.locator('[data-storage-notice]').inner_text(),'storage '+mode+' fallback disclosed');f.close()
        f=Harness(browser,args.base,True);f.memory={'qeva.learner.v1':'{broken'};page=f.load('learn/index.html');check(page.evaluate("localStorage.getItem('qeva.learner.v1')")=='{broken','corrupt stored bytes preserved on page startup');f.close()
    browser.close()
result={'mode':'embedded DOM with injected origin and storage' if args.embedded else 'native HTTP','checks_passed':len(checks),'checks':checks,'limitations':['No cross-browser/screen-reader certification.','Embedded mode does not test HTTP navigation, native origin storage, browser download prompts or clipboard permissions. Full JSON serialization/import and DOM behavior are tested.']}
(OUT/'browser-results.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'mode':result['mode'],'checks_passed':len(checks)},indent=2))
