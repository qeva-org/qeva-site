"""Optional Playwright harness. Embedded mode is DOM testing, NOT native HTTP/storage testing."""
from pathlib import Path
from urllib.parse import urlsplit
import json,base64
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
class Harness:
    def __init__(self,browser,base='http://localhost:8000/',embedded=False,width=1440,height=1000):
        self.context=browser.new_context(viewport={'width':width,'height':height},accept_downloads=True)
        self.page=None;self.base=base;self.embedded=embedded;self.memory={};self.errors=[];self.block=None
    def load(self,url,scripts=True):
        if self.page:
            if self.embedded:
                self.memory=self.page.evaluate('window.__storageData || {}')
            self.page.close()
        self.page=self.context.new_page();page=self.page;page.set_default_timeout(5000)
        page.on('pageerror',lambda e:self.errors.append(str(e)))
        page.on('dialog',lambda d:d.accept('RESET') if d.type=='prompt' else d.accept())
        if not self.embedded:
            page.goto(self.base+url);return page
        path=ROOT/urlsplit(url).path;path=path/'index.html' if path.is_dir() else path
        soup=BeautifulSoup(path.read_text(encoding='utf-8'),'html.parser');sources=[]
        for tag in soup.find_all('script'):
            if tag.get('src'):sources.append((path.parent/urlsplit(tag['src']).path).read_text(encoding='utf-8'))
            tag.decompose()
        for link in list(soup.find_all('link')):
            if 'stylesheet' in link.get('rel',[]):
                style=soup.new_tag('style');style.string=(path.parent/link['href']).read_text();link.replace_with(style)
            else:link.decompose()
        for img in soup.find_all('img'):
            if img.get('src') and not urlsplit(img['src']).scheme:
                data=(path.parent/img['src']).read_bytes();img['src']='data:image/svg+xml;base64,'+base64.b64encode(data).decode()
        if scripts:
            for ns in soup.find_all('noscript'):ns.decompose()
        else:
            for ns in soup.find_all('noscript'):ns.unwrap()
        page.set_content(str(soup),wait_until='domcontentloaded')
        page.evaluate('''(data)=>{
          window.__storageData=data.memory;
          window.__block=data.block;
          window.__testLocation=new URL(data.url);
          window.__testHistory={replaceState:function(a,b,url){window.__testLocation=new URL(url,window.__testLocation.href);}};
          Object.defineProperty(window,'localStorage',{configurable:true,value:{
            getItem:function(k){if(window.__block==='read')throw new DOMException('Harness read denied','SecurityError');return Object.prototype.hasOwnProperty.call(window.__storageData,k)?window.__storageData[k]:null;},
            setItem:function(k,v){if(window.__block==='write')throw new DOMException('Harness quota exceeded','QuotaExceededError');window.__storageData[k]=String(v);},
            removeItem:function(k){delete window.__storageData[k];}
          }});
        }''',{'memory':self.memory,'block':self.block,'url':self.base+url})
        if scripts:
            for source in sources:
                page.evaluate('(function(location,history){\n'+source+'\n})(window.__testLocation,window.__testHistory);')
        return page
    def close(self):self.context.close()
