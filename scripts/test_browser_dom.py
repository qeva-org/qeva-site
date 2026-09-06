"""In-memory Chromium DOM tests. Not deployment/CSP tests: managed browser blocks all URLs."""
import json,re,base64
from pathlib import Path
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
import argparse, tempfile
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--out',type=Path);args=parser.parse_args()
ROOT=Path(__file__).resolve().parents[1]/'dist';OUT=args.out or Path(tempfile.mkdtemp(prefix='qeva-dom-'));OUT.mkdir(parents=True,exist_ok=True)
report={'mode':'in-memory DOM; CSP/resource loading omitted for script injection; no deployed browser claim', 'pageerrors':[], 'cases':[], 'routes':[]}
def mount(page,path,js=True):
 f=ROOT/path;soup=BeautifulSoup(f.read_text(),'html.parser')
 scripts=[(f.parent/n['src']).resolve() for n in soup.find_all('script',src=True)]
 for n in soup.find_all('img',src=True):
  resource=(f.parent/n['src']).resolve()
  if resource.is_file() and resource.is_relative_to(ROOT):n['src']='data:image/png;base64,'+base64.b64encode(resource.read_bytes()).decode()
 for n in soup.find_all('script'):n.decompose()
 for n in soup.find_all('link'):n.decompose()
 for n in soup.find_all('meta',attrs={'http-equiv':True}):n.decompose()
 page.set_content(str(soup));page.add_style_tag(content=(ROOT/'assets/site.css').read_text())
 if js:
  page.evaluate('''(() => { const store = window.__qevaMemory || (window.__qevaMemory = new Map()); Object.defineProperty(window, "localStorage", {configurable:true, value:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v))}}); })()''')
  for s in scripts:page.add_script_tag(content=s.read_text())
 page.wait_for_timeout(15)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=b.new_context(viewport={'width':1440,'height':1000});page=ctx.new_page()
 page.on('pageerror',lambda e:report['pageerrors'].append(str(e)))
 for path in ['index.html','lab/index.html','map/index.html','history/index.html','search/index.html','about/index.html']:
  mount(page,path);report['routes'].append({'path':path,'overflow':page.evaluate('document.documentElement.scrollWidth>innerWidth')})
  if path in ['index.html','lab/index.html','map/index.html']:page.screenshot(path=str(OUT/('v051-dom-'+path.replace('/','-')+'.png')),full_page=True)
 mount(page,'lab/index.html')
 options=page.locator('#experiment-select option').evaluate_all('(os)=>os.map(o=>o.value)')
 for opt in options:
  page.select_option('#experiment-select',opt)
  for mode in ['run','diff','observer','sweep','attack']:
   page.locator(f'[data-mode="{mode}"]').click();
   report['cases'].append({'experiment':opt,'mode':mode,'status':page.locator('#execution-state').inner_text(),'error':page.locator('#lab-error').inner_text(),'summary':page.locator('#mode-output').inner_text()[:220]})
 page.evaluate('window.__blob=null; URL.createObjectURL=(b)=>{window.__blob=b;return "blob:unit-test"}; URL.revokeObjectURL=()=>{};HTMLAnchorElement.prototype.click=function(){}')
 report['mode_roundtrips']=[]
 for opt in options:
  page.select_option('#experiment-select',opt)
  for mode in ['run','diff','observer','sweep','attack']:
   page.locator(f'[data-mode="{mode}"]').click();page.locator('#export-run').click()
   payload=page.evaluate('window.__blob.text()')
   page.locator('#experiment-file').set_input_files({'name':'roundtrip.json','mimeType':'application/json','buffer':payload.encode()});page.wait_for_timeout(30)
   report['mode_roundtrips'].append({'experiment':opt,'mode':mode,'error':page.locator('#lab-error').inner_text()})
 page.select_option('#experiment-select','qeva-experiment:1:logistic-sensitivity@1');page.locator('[data-mode="sweep"]').click()
 report['sweep_requested_vs_status']={'requested':page.locator('#sweep-samples').input_value(),'status':page.locator('#execution-state').inner_text(),'text':page.locator('#mode-output').inner_text()}
 page.evaluate('window.__blob=null; URL.createObjectURL=(b)=>{window.__blob=b;return "blob:unit-test"}; URL.revokeObjectURL=()=>{};HTMLAnchorElement.prototype.click=function(){}')
 page.locator('#export-run').click();data=page.evaluate('window.__blob.text()');(OUT/'upgraded-run-export.json').write_text(data)
 page.locator('#experiment-file').set_input_files(str(OUT/'upgraded-run-export.json'));page.wait_for_timeout(80)
 report['run_export_reimport']={'error':page.locator('#lab-error').inner_text()}
 # Hidden required inputs must not block a different mode.
 page.locator('[data-mode="sweep"]').click(); page.locator('#sweep-min').fill('')
 page.locator('[data-mode="run"]').click()
 report['hidden_field_validation']={'disabled':page.locator('#sweep-controls').evaluate('(e)=>e.disabled'),'error':page.locator('#lab-error').inner_text(),'status':page.locator('#execution-state').inner_text()}
 # Persist and reopen a saved record in a new document (storage adapter is simulated).
 page.locator('#workspace-name').fill('Reproducible test')
 page.locator('#workspace-notes').fill('Reference note')
 page.locator('#workspace-save').click()
 report['local_save']={'status':page.locator('#workspace-status').inner_text(),'entries':page.locator('#workspace-select option').count()}
 mount(page,'lab/index.html');page.locator('#workspace-load').click()
 report['local_restore']={'status':page.locator('#workspace-status').inner_text(),'notes':page.locator('#workspace-notes').input_value()}
 # Tampered aggregate must be rejected; run metadata alone is insufficient.
 tampered=json.loads(data);tampered['analysis']['rows'][0]['metric']=99999
 page.locator('#experiment-file').set_input_files({'name':'tampered.json','mimeType':'application/json','buffer':json.dumps(tampered).encode()})
 page.wait_for_timeout(50)
 report['tampered_analysis']={'error':page.locator('#lab-error').inner_text()}
 page.set_viewport_size({'width':390,'height':844})
 for path in ['index.html','lab/index.html','map/index.html','history/index.html','search/index.html']:
  mount(page,path);report['routes'].append({'path':path,'mobile':True,'overflow':page.evaluate('document.documentElement.scrollWidth>innerWidth'),'width':page.evaluate('document.documentElement.scrollWidth')})
  if path=='lab/index.html':page.screenshot(path=str(OUT/'v051-dom-mobile-lab.png'),full_page=True)
 # scrollbar offenders
 report['mobile_overflow_elements']=page.evaluate('Array.from(document.querySelectorAll("body *")).filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,12).map(e=>({tag:e.tagName,id:e.id,cls:e.className,width:e.getBoundingClientRect().width}))')
 b.close()
(OUT/'upgraded-dom.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
